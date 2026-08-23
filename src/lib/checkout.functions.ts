import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().trim().max(40).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: cart, error: cartErr } = await supabase
      .from("cart_items")
      .select("id, course_id, courses(id,title,price,is_free)")
      .eq("student_id", userId);
    if (cartErr) throw new Error(cartErr.message);
    if (!cart || cart.length === 0) throw new Error("السلة فارغة");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let promo: {
      id: string;
      marketer_id: string | null;
      discount_percent: number;
      commission_percent: number;
      uses_count: number;
    } | null = null;

    const rawCode = data.code?.trim();
    if (rawCode) {
      const code = rawCode.toUpperCase();
      const { data: found } = await supabaseAdmin
        .from("promo_codes")
        .select("id,marketer_id,discount_percent,commission_percent,uses_count")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (!found) throw new Error("كود الخصم غير صالح");

      const { data: settings } = await supabaseAdmin
        .from("platform_settings")
        .select("max_uses_per_student")
        .eq("id", 1)
        .maybeSingle();
      const maxUses = Number(settings?.max_uses_per_student ?? 1);

      const { count } = await supabaseAdmin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_code_id", found.id)
        .eq("student_id", userId);
      if ((count ?? 0) >= maxUses) throw new Error("لقد استخدمت هذا الكود من قبل");

      promo = found;
    }

    const discount = promo?.discount_percent ?? 0;
    let total = 0;
    for (const item of cart) {
      const price = item.courses?.is_free ? 0 : Number(item.courses?.price ?? 0);
      total += price - (price * discount) / 100;
    }
    total = Math.round(total * 100) / 100;

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    const balance = Number(profile?.wallet_balance ?? 0);
    if (balance < total) throw new Error("رصيد المحفظة غير كافٍ. اشحن المحفظة أولًا.");

    if (promo) {
      const { error: redeemErr } = await supabaseAdmin
        .from("promo_redemptions")
        .insert({ promo_code_id: promo.id, student_id: userId });
      if (redeemErr) throw new Error("لقد استخدمت هذا الكود من قبل");
    }

    let totalCommission = 0;

    for (const item of cart) {
      const price = item.courses?.is_free ? 0 : Number(item.courses?.price ?? 0);
      const paid = Math.round((price - (price * discount) / 100) * 100) / 100;

      const { error: enrollErr } = await supabase
        .from("enrollments")
        .insert({ student_id: userId, course_id: item.course_id, price_paid: paid });
      if (enrollErr && !enrollErr.message.includes("duplicate")) throw new Error(enrollErr.message);

      if (promo?.marketer_id) {
        const commission = Math.round(((paid * promo.commission_percent) / 100) * 100) / 100;
        totalCommission += commission;
        await supabaseAdmin.from("referrals").insert({
          marketer_id: promo.marketer_id,
          promo_code_id: promo.id,
          student_id: userId,
          course_id: item.course_id,
          amount: paid,
          commission,
        });
      }
    }

    await supabase
      .from("profiles")
      .update({ wallet_balance: Math.round((balance - total) * 100) / 100 })
      .eq("id", userId);

    await supabase.from("wallet_transactions").insert({
      user_id: userId,
      amount: -total,
      kind: "purchase",
      description: `شراء ${cart.length} كورس`,
    });

    if (promo) {
      await supabaseAdmin
        .from("promo_codes")
        .update({ uses_count: promo.uses_count + cart.length })
        .eq("id", promo.id);

      if (promo.marketer_id && totalCommission > 0) {
        const { data: marketer } = await supabaseAdmin
          .from("marketers")
          .select("balance")
          .eq("id", promo.marketer_id)
          .maybeSingle();
        const next = Math.round((Number(marketer?.balance ?? 0) + totalCommission) * 100) / 100;
        await supabaseAdmin.from("marketers").update({ balance: next }).eq("id", promo.marketer_id);
      }
    }

    await supabase.from("cart_items").delete().eq("student_id", userId);

    return { ok: true, total, count: cart.length };
  });
