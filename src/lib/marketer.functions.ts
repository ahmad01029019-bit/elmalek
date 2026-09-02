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

/* ===================== تحقق البريد الإلكتروني (OTP) ===================== */

const emailSchema = z.string().trim().email().max(255);

/**
 * يُنشئ كود تحقق للمسوّق ويخزّنه، وجاهز للربط بخدمة إرسال البريد لاحقًا.
 * حاليًا (بدون خدمة بريد مربوطة) يُعاد الكود في الاستجابة لتستمر التجربة.
 */
export const sendMarketerOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ email: emailSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("marketer_email_otps")
      .insert({ email, code, expires_at: expires, purpose: "marketer_signup" });
    if (error) throw new Error("تعذر إنشاء كود التحقق، حاول مرة أخرى");

    // نقطة الربط المستقبلية بخدمة إرسال البريد:
    const apiKey = process.env["EMAIL_API_KEY"];
    if (apiKey) {
      // TODO: استدعاء مزوّد البريد الفعلي هنا وإرسال code إلى email.
      return { ok: true, delivered: true as const, devCode: null as string | null };
    }

    return { ok: true, delivered: false as const, devCode: code };
  });

/** يتحقق من صحة كود البريد المرسل للمسوّق. */
export const verifyMarketerOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: emailSchema, code: z.string().trim().length(6) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: row } = await supabaseAdmin
      .from("marketer_email_otps")
      .select("id,code,expires_at,consumed_at,attempts")
      .eq("email", email)
      .eq("purpose", "marketer_signup")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("لم يتم إرسال كود لهذا البريد، اطلب كودًا جديدًا");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("انتهت صلاحية الكود، اطلب كودًا جديدًا");
    if ((row.attempts ?? 0) >= 5) throw new Error("تجاوزت عدد المحاولات المسموح بها");

    if (row.code !== data.code.trim()) {
      await supabaseAdmin
        .from("marketer_email_otps")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      throw new Error("كود التحقق غير صحيح");
    }

    await supabaseAdmin
      .from("marketer_email_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true };
  });

/* ===================== إعدادات المسوّق ===================== */

/** يعدّل إزاحة الخصم الخاصة بالمسوّق ضمن الحد الآمن للمنصة. */
export const updateMarketerOffset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ offset: z.number().min(-20).max(20) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("max_offset_percent")
      .eq("id", 1)
      .maybeSingle();
    const max = Number(settings?.max_offset_percent ?? 5);
    const offset = Math.round(data.offset * 100) / 100;
    if (Math.abs(offset) > max) throw new Error(`أقصى إزاحة مسموح بها ± ${max}%`);

    const { data: marketer } = await supabaseAdmin
      .from("marketers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!marketer) throw new Error("لا يوجد حساب مسوّق مرتبط بحسابك");

    const { error } = await supabaseAdmin
      .from("marketers")
      .update({ discount_offset: offset })
      .eq("id", marketer.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("marketer_activity_logs").insert({
      marketer_id: marketer.id,
      actor_user_id: context.userId,
      action: "تعديل إزاحة الخصم",
      details: `الإزاحة الجديدة ${offset}%`,
    });

    return { ok: true, offset };
  });

/** يغيّر كود المسوّق الحالي إلى كود جديد متاح. */
export const changePromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const parsed = codeSchema.safeParse(data.code);
    if (!parsed.success) throw new Error("صيغة الكود غير صحيحة (حروف إنجليزية وأرقام من 3 إلى 20)");
    const code = parsed.data.toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: marketer } = await supabaseAdmin
      .from("marketers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!marketer) throw new Error("لا يوجد حساب مسوّق مرتبط بحسابك");

    const { data: taken } = await supabaseAdmin
      .from("promo_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (taken) throw new Error("هذا الكود مستخدم بالفعل، جرّب كودًا آخر");

    const { data: mine } = await supabaseAdmin
      .from("promo_codes")
      .select("id,code")
      .eq("marketer_id", marketer.id)
      .maybeSingle();
    if (!mine) throw new Error("لا يوجد كود لتغييره، أنشئ كودك أولًا");

    const { error } = await supabaseAdmin.from("promo_codes").update({ code }).eq("id", mine.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("marketer_activity_logs").insert({
      marketer_id: marketer.id,
      actor_user_id: context.userId,
      action: "تغيير كود الخصم",
      details: `من ${mine.code} إلى ${code}`,
    });

    return { ok: true, code };
  });
