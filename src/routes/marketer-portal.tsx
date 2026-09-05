import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { BadgePercent, Eye, EyeOff, LineChart, Lock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMarketerOtp, verifyMarketerOtp } from "@/lib/marketer.functions";


export const Route = createFileRoute("/marketer-portal")({
  head: () => ({
    meta: [
      { title: "بوابة المسوّقين | منصة المُلك" },
      {
        name: "description",
        content:
          "بوابة خاصة بمسوّقي منصة المُلك: تسجيل دخول وإنشاء حساب مسوّق لمتابعة الأكواد والعمولات والسحوبات.",
      },
      { property: "og:title", content: "بوابة المسوّقين | منصة المُلك" },
      {
        property: "og:description",
        content: "دخول المسوّقين لإدارة أكواد الخصم والعمولات وطلبات السحب.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketerPortalPage,
});

const perks = [
  { icon: BadgePercent, title: "كودك الخاص", text: "خصم 10% للطالب وعمولة 10% لك من أول عملية." },
  { icon: LineChart, title: "تتبّع مباشر", text: "سجل مفصّل بكل عملية شراء تمت بكودك ووقتها." },
  { icon: Wallet, title: "سحب مرن", text: "اطلب سحب أرباحك من 1000 ج.م عبر المحفظة أو انستاباي." },
];

function MarketerPortalPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const sendOtp = useServerFn(sendMarketerOtp);
  const verifyOtp = useServerFn(verifyMarketerOtp);


  function startOtpCountdown() {
    setOtpCountdown(60);
    const timer = setInterval(() => {
      setOtpCountdown((c) => {
        if (c <= 1) clearInterval(timer);
        return Math.max(0, c - 1);
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (!email) {
      toast.error("اكتب بريدك الإلكتروني أولًا");
      return;
    }
    setLoading(true);
    try {
      const result = await sendOtp({ email });

      setOtpSent(true);
      startOtpCountdown();
      if (result.delivered) {
        toast.success("تم إرسال كود التحقق إلى بريدك");
      } else {
        toast.success(`كود التحقق التجريبي: ${result.devCode}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال كود التحقق");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        if (!otpSent) {
          toast.error("أرسل كود التحقق إلى بريدك أولًا");
          setLoading(false);
          return;
        }
        await verifyOtp({ email, code: otp });


        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/marketer-portal`,
            data: { full_name: fullName, phone, role: "marketer" },
          },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("هذا البريد مسجّل بالفعل. سجّل الدخول بدلًا من ذلك.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("تم إنشاء حساب المسوّق وتسجيل الدخول. أهلًا بك!");
        navigate({ to: "/marketer", replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("invalid login")) {
          toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const isMarketer = (roles ?? []).some((r) => r.role === "marketer");

      if (!isMarketer) {
        await supabase.auth.signOut();
        toast.error("هذه البوابة مخصصة لحسابات المسوّقين فقط.");
        return;
      }

      toast.success("أهلًا بك في بوابة المسوّقين");
      navigate({ to: "/marketer", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="marketer-theme min-h-screen">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <section className="rounded-3xl violet-gradient violet-glow p-8 text-primary-foreground">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs">
            <Lock className="size-3.5" /> بوابة خاصة بالمسوّقين
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-snug sm:text-4xl">
            بوابة مسوّقي منصة المُلك
          </h1>
          <p className="mt-3 text-sm leading-8 text-primary-foreground/85">
            مساحة منفصلة تمامًا عن حسابات الطلاب: أنشئ كودك، تابع عمولاتك لحظة بلحظة، واطلب سحب
            أرباحك بسهولة.
          </p>
          <div className="mt-8 space-y-4">
            {perks.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15">
                  <p.icon className="size-5" />
                </span>
                <div>
                  <p className="font-bold">{p.title}</p>
                  <p className="text-sm text-primary-foreground/80">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl card-soft p-6 sm:p-8">
          <div className="flex rounded-2xl bg-secondary p-1">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setOtpSent(false);
                  setOtp("");
                  setOtpCountdown(0);
                }}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "تسجيل الدخول" : "حساب مسوّق جديد"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {tab === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mp-name">الاسم بالكامل</Label>
                  <Input
                    id="mp-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp-phone">رقم الهاتف</Label>
                  <Input
                    id="mp-phone"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="mp-email">البريد الإلكتروني</Label>
              <Input
                id="mp-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp-password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="mp-password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {tab === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="mp-otp">كود التحقق من البريد</Label>
                <div className="flex gap-2">
                  <Input
                    id="mp-otp"
                    dir="ltr"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || otpCountdown > 0}
                    onClick={handleSendOtp}
                  >
                    {otpCountdown > 0 ? `${otpCountdown} ث` : otpSent ? "إعادة الإرسال" : "أرسل الكود"}
                  </Button>
                </div>
                {otpSent && (
                  <p className="text-xs text-muted-foreground">
                    أدخل الكود المكون من 6 أرقام المرسل إلى بريدك.
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جارٍ التنفيذ..." : tab === "login" ? "دخول المسوّق" : "إنشاء حساب مسوّق"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">
            هذه البوابة مخصصة للمسوّقين المعتمدين فقط — حسابات الطلاب لا يمكنها الدخول من هنا.
          </p>
        </section>
      </div>
    </div>
  );
}
