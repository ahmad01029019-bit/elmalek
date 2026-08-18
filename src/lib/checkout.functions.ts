import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const promoInput = z.object({ code: z.string().trim().min(1).max(40) });

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

    let promo: {
      id: string;
      marketer_id: string | null;
      discount_percent: number;
      commission_percent: number;
      uses_count: number;
    } | null = null;

    if (data.code) {
      const parsed = promoInput.safeParse({ code: data.code });
      if (parsed.success) {
        const { data: found } = await supabase
          .from("promo_codes")
          .select("id,marketer_id,discount_percent,commission_percent,uses_count")
          .eq("code", parsed.data.code.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();
        if (!found) throw new Error("كود الخصم غير صالح");
        promo = found;
      }
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

    for (const item of cart) {
      const price = item.courses?.is_free ? 0 : Number(item.courses?.price ?? 0);
      const paid = Math.round((price - (price * discount) / 100) * 100) / 100;

      const { error: enrollErr } = await supabase
        .from("enrollments")
        .insert({ student_id: userId, course_id: item.course_id, price_paid: paid });
      if (enrollErr && !enrollErr.message.includes("duplicate")) throw new Error(enrollErr.message);

      if (promo?.marketer_id) {
        const commission = Math.round(((paid * promo.commission_percent) / 100) * 100) / 100;
        await supabase.from("referrals").insert({
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
      student_id: userId,
      amount: -total,
      type: "purchase",
      note: `شراء ${cart.length} كورس`,
    });

    if (promo) {
      await supabase
        .from("promo_codes")
        .update({ uses_count: promo.uses_count + cart.length })
        .eq("id", promo.id);
    }

    await supabase.from("cart_items").delete().eq("student_id", userId);

    return { ok: true, total, count: cart.length };
  });
