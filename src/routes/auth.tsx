import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useSession } from "@/lib/auth";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "marketer"]).catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول وإنشاء حساب | منصة المُلك" },
      {
        name: "description",
        content: "سجّل دخولك أو أنشئ حسابك للوصول إلى كورساتك واختباراتك على منصة المُلك.",
      },
      { property: "og:title", content: "تسجيل الدخول | منصة المُلك" },
      { property: "og:description", content: "الوصول إلى حسابك على منصة المُلك التعليمية." },
    ],
  }),
  component: AuthPage,
});

const stages = ["الأول الإعدادي", "الثاني الإعدادي", "الثالث الإعدادي", "الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"];
const tracks = ["علمي علوم", "علمي رياضة", "أدبي", "غير محدد"];
const eduTypes = ["عام", "أزهري", "لغات"];

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("الأول الثانوي");
  const [track, setTrack] = useState("علمي علوم");
  const [eduType, setEduType] = useState("عام");

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  const isSignup = mode !== "login";
  const isMarketer = mode === "marketer";
  const isPrep = stage.includes("الإعدادي");

  async function handleForgotPassword() {
    if (!email) {
      toast.error("اكتب بريدك الإلكتروني أولًا");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              phone,
              stage: isMarketer ? null : stage,
              track: isMarketer || isPrep ? null : track,
              edu_type: isMarketer ? null : eduType,
              role: isMarketer ? "marketer" : "student",
            },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. تفقّد بريدك لتأكيد التسجيل ثم سجّل الدخول.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("تعذّر تسجيل الدخول عبر جوجل");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl card-soft p-6">
          <h1 className="text-2xl font-bold">
            {isMarketer ? "تسجيل مسوّق جديد" : isSignup ? "إنشاء حساب طالب" : "تسجيل الدخول"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isMarketer
              ? "أنشئ حسابك كمسوّق واحصل على كود خصم خاص بك."
              : "ادخل إلى حسابك لمتابعة كورساتك واختباراتك."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">الاسم بالكامل</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </div>
            )}

            {isSignup && !isMarketer && (
              <div className={`grid gap-4 ${isPrep ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <PickField label="الصف" value={stage} onChange={setStage} options={stages} />
                {!isPrep && (
                  <PickField label="الشعبة" value={track} onChange={setTrack} options={tracks} />
                )}
                <PickField label="النظام" value={eduType} onChange={setEduType} options={eduTypes} />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جارٍ التنفيذ..." : isSignup ? "إنشاء الحساب" : "دخول"}
            </Button>

            {!isSignup && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary"
              >
                نسيت كلمة المرور؟
              </button>
            )}
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            أو
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            المتابعة باستخدام جوجل
          </Button>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                ليس لديك حساب؟{" "}
                <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-primary">
                  أنشئ حسابك الآن
                </Link>
              </>
            ) : (
              <>
                لديك حساب بالفعل؟{" "}
                <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-primary">
                  تسجيل الدخول
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function PickField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
