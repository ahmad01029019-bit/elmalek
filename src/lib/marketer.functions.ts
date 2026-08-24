import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const codeSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9_-]+$/, "الكود يجب أن يحتوي على حروف إنجليزية وأرقام فقط");

async function loadSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("platform_settings")
    .select("default_discount_percent,default_commission_percent,min_payout_amount")
    .eq("id", 1)
    .maybeSingle();
  return {
    discount: Number(data?.default_discount_percent ?? 10),
    commission: Number(data?.default_commission_percent ?? 10),
    minPayout: Number(data?.min_payout_amount ?? 1000),
  };
}

/** يتحقق هل الكود متاح أم مستخدم من قبل. */
export const checkPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const parsed = codeSchema.safeParse(data.code);
    if (!parsed.success) {
      return { available: false, reason: "صيغة الكود غير صحيحة (حروف إنجليزية وأرقام من 3 إلى 20)" };
    }
    const code = parsed.data.toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: found, error } = await supabaseAdmin
      .from("promo_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return found
      ? { available: false, reason: "هذا الكود مستخدم بالفعل، جرّب كودًا آخر" }
      : { available: true, reason: "الكود متاح ✨" };
  });

/** ينشئ كود المسوّق بالنسب الافتراضية للمنصة. */
export const claimPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const parsed = codeSchema.safeParse(data.code);
    if (!parsed.success) throw new Error("صيغة الكود غير صحيحة (حروف إنجليزية وأرقام من 3 إلى 20)");
    const code = parsed.data.toUpperCase();
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "marketer")) throw new Error("هذا الحساب ليس حساب مسوّق");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let { data: marketer } = await supabaseAdmin
      .from("marketers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!marketer) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name,phone")
        .eq("id", userId)
        .maybeSingle();
      const { data: created, error: createErr } = await supabaseAdmin
        .from("marketers")
        .insert({
          user_id: userId,
          display_name: profile?.full_name || "مسوّق",
          phone: profile?.phone ?? null,
          status: "approved",
        })
        .select("id")
        .single();
      if (createErr) throw new Error(createErr.message);
      marketer = created;
    }

    const { data: existing } = await supabaseAdmin
      .from("promo_codes")
      .select("id")
      .eq("marketer_id", marketer!.id)
      .maybeSingle();
    if (existing) throw new Error("لديك كود بالفعل");

    const { data: taken } = await supabaseAdmin
      .from("promo_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (taken) throw new Error("هذا الكود مستخدم بالفعل، جرّب كودًا آخر");

    const settings = await loadSettings();
    const { error } = await supabaseAdmin.from("promo_codes").insert({
      marketer_id: marketer!.id,
      code,
      discount_percent: settings.discount,
      commission_percent: settings.commission,
      is_active: true,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_notifications").insert({
      kind: "promo_created",
      title: "مسوّق أنشأ كود خصم جديد",
      body: `الكود ${code} — خصم ${settings.discount}% وعمولة ${settings.commission}%`,
      ref_id: marketer!.id,
    });

    return { ok: true, code, ...settings };
  });

/** طلب سحب الأرباح (الحد الأدنى يحدده إعداد المنصة). */
export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        amount: z.number().positive().max(1_000_000),
        method: z.enum(["محفظة إلكترونية", "انستاباي"]),
        account: z.string().trim().min(5).max(60),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: marketer } = await supabaseAdmin
      .from("marketers")
      .select("id,display_name,balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (!marketer) throw new Error("لا يوجد حساب مسوّق مرتبط بحسابك");

    const settings = await loadSettings();
    const amount = Math.round(data.amount * 100) / 100;
    if (amount < settings.minPayout) throw new Error(`الحد الأدنى للسحب ${settings.minPayout} ج.م`);
    if (amount > Number(marketer.balance ?? 0)) throw new Error("المبلغ أكبر من رصيدك المتاح");

    const { data: pending } = await supabaseAdmin
      .from("payouts")
      .select("id")
      .eq("marketer_id", marketer.id)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) throw new Error("لديك طلب سحب قيد المراجعة بالفعل");

    const { data: payout, error } = await supabaseAdmin
      .from("payouts")
      .insert({
        marketer_id: marketer.id,
        amount,
        method: data.method,
        account_ref: data.account,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_notifications").insert({
      kind: "payout_request",
      title: "طلب سحب أرباح جديد",
      body: `${marketer.display_name} — ${amount} ج.م — ${data.method} — ${data.account}`,
      ref_id: payout.id,
    });

    return { ok: true, amount };
  });

/** يسجّل نشاط المسوّق لتطّلع عليه الإدارة. */
export const logMarketerActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ action: z.string().max(60), details: z.string().max(400).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: marketer } = await supabaseAdmin
      .from("marketers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!marketer) return { ok: false };
    await supabaseAdmin.from("marketer_activity_logs").insert({
      marketer_id: marketer.id,
      actor_user_id: context.userId,
      action: data.action,
      details: data.details ?? null,
    });
    return { ok: true };
  });

/** محتوى حساب الطالب التجريبي — متاح للمسوّق فقط. */
export const demoStudentContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        stage: z.string().max(40),
        track: z.string().max(40).nullable().optional(),
        eduType: z.string().max(40),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "marketer" || r.role === "admin")) {
      throw new Error("هذه الميزة متاحة لحسابات المسوّقين فقط");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("courses")
      .select("id,title,subject,stage,track,edu_type,price,is_free,cover_url,teachers(name)")
      .eq("is_published", true)
      .eq("stage", data.stage)
      .eq("edu_type", data.eduType)
      .limit(60);
    if (data.track) q = q.or(`track.is.null,track.eq.${data.track}`);
    const { data: courses, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (courses ?? []).map((c) => c.id);
    const { data: lessons } = ids.length
      ? await supabaseAdmin
          .from("lessons")
          .select("id,course_id,title,youtube_id,duration_minutes,position")
          .in("course_id", ids)
          .order("position")
      : { data: [] as never[] };

    return { courses: courses ?? [], lessons: lessons ?? [] };
  });
