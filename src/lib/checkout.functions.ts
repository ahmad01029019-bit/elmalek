import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { academicYearLabel, levelForCount, type MarketerLevel } from "@/lib/marketer-levels";

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

    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select(
        "max_uses_per_student,academic_year_start_month,repeat_commission_percent,default_discount_percent",
      )
      .eq("id", 1)
      .maybeSingle();

    const year = academicYearLabel(Number(settings?.academic_year_start_month ?? 9));
    const maxUses = Number(settings?.max_uses_per_student ?? 5);
    const repeatPercent = Number(settings?.repeat_commission_percent ?? 10);

    let promo: {
      id: string;
      marketer_id: string | null;
      discount_percent: number;
      commission_percent: number;
      uses_count: number;
    } | null = null;
    let marketerRow: {
      id: string;
      balance: number;
      season_students: number;
      season_year: string | null;
      discount_offset: number;
    } | null = null;
    let isNewCustomer = true;

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

      // حد الاستخدام: 5 محاولات للطالب في العام الدراسي الواحد
      const { count: yearUses } = await supabaseAdmin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("academic_year", year);
      if ((yearUses ?? 0) >= maxUses) {
        throw new Error(`لقد استنفدت عدد مرات استخدام أكواد الخصم (${maxUses}) لهذا العام الدراسي`);
      }

      // عميل جديد تمامًا = لم يسبق له استخدام أي كود من قبل
      const { count: everUsed } = await supabaseAdmin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId);
      isNewCustomer = (everUsed ?? 0) === 0;

      if (found.marketer_id) {
        const { data: m } = await supabaseAdmin
          .from("marketers")
          .select("id,balance,season_students,season_year,discount_offset,status")
          .eq("id", found.marketer_id)
          .maybeSingle();
        if (m && m.status === "suspended") throw new Error("هذا الكود موقوف حاليًا");
        if (m) {
          marketerRow = {
            id: m.id,
            balance: Number(m.balance ?? 0),
            season_students: m.season_year === year ? Number(m.season_students ?? 0) : 0,
            season_year: m.season_year,
            discount_offset: Number(m.discount_offset ?? 0),
          };
        }
      }

      promo = found;
    }

    // خصم الطالب = خصم الكود + إزاحة المسوّق
    const discount = promo
      ? Math.max(0, Math.min(90, Number(promo.discount_percent) + (marketerRow?.discount_offset ?? 0)))
      : 0;

    // نسبة عمولة المسوّق: مستواه الحالي للعميل الجديد، ونسبة ثابتة للعميل المتكرر
    let levels: MarketerLevel[] = [];
    let commissionPercent = Number(promo?.commission_percent ?? 0);
    let currentLevel = 1;
    if (marketerRow) {
      const { data: lv } = await supabaseAdmin
        .from("marketer_levels")
        .select("level,name,min_students,max_students,commission_percent,shield")
        .order("level");
      levels = (lv ?? []) as MarketerLevel[];
      const lvl = levelForCount(levels, marketerRow.season_students);
      currentLevel = lvl?.level ?? 1;
      commissionPercent = isNewCustomer ? Number(lvl?.commission_percent ?? commissionPercent) : repeatPercent;
    }

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
        .insert({ promo_code_id: promo.id, student_id: userId, academic_year: year });
      if (redeemErr) throw new Error("تعذر تسجيل استخدام الكود، حاول مرة أخرى");
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
        const commission = Math.round(((paid * commissionPercent) / 100) * 100) / 100;
        totalCommission += commission;
        await supabaseAdmin.from("referrals").insert({
          marketer_id: promo.marketer_id,
          promo_code_id: promo.id,
          student_id: userId,
          course_id: item.course_id,
          amount: paid,
          commission,
          academic_year: year,
          is_new_customer: isNewCustomer,
          level_at_time: currentLevel,
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

      if (marketerRow) {
        // العدّاد يرتفع لكل عملية شراء (جديد أو متكرر) كتحفيز، ويتصفّر مع بداية عام دراسي جديد
        const nextCount = marketerRow.season_students + 1;
        const nextLevel = levelForCount(levels, nextCount)?.level ?? currentLevel;
        await supabaseAdmin
          .from("marketers")
          .update({
            balance: Math.round((marketerRow.balance + totalCommission) * 100) / 100,
            season_students: nextCount,
            season_year: year,
            level: nextLevel,
          })
          .eq("id", marketerRow.id);

        if (nextLevel > currentLevel) {
          await supabaseAdmin.from("admin_notifications").insert({
            kind: "marketer_level_up",
            title: "مسوّق ترقّى لمستوى جديد",
            body: `المسوّق ${marketerRow.id} وصل إلى المستوى ${nextLevel} برصيد ${nextCount} طالب`,
            ref_id: marketerRow.id,
          });
        }
      }
    }

    await supabase.from("cart_items").delete().eq("student_id", userId);

    return { ok: true, total, count: cart.length, discount, isNewCustomer };
  });
