import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BadgePercent, LineChart, Lock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/marketer-portal`,
            data: { full_name: fullName, phone, role: "marketer" },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء حساب المسوّق. أكّد بريدك ثم سجّل الدخول من هنا.");
        setTab("login");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

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
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
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
                onClick={() => setTab(t)}
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
              <Input
                id="mp-password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

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
