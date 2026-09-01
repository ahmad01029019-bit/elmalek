import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  BadgePercent,
  Check,
  Copy,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { MarketerShell } from "@/components/marketer/MarketerShell";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { formatEGP } from "@/lib/education";
import { checkPromoCode, claimPromoCode, requestPayout } from "@/lib/marketer.functions";

export const Route = createFileRoute("/_marketer/marketer")({
  head: () => ({
    meta: [
      { title: "لوحة المسوق | منصة المُلك" },
      {
        name: "description",
        content: "أنشئ كود الخصم الخاص بك وتابع عمولاتك وسجل عمليات الشراء واطلب سحب أرباحك.",
      },
      { property: "og:title", content: "لوحة المسوق | منصة المُلك" },
      { property: "og:description", content: "كودك، أرباحك، وطلبات السحب في مكان واحد." },
    ],
  }),
  component: MarketerPage,
});

function MarketerPage() {
  const { session } = useSession();
  const { data: profile } = useProfile();
  const uid = session?.user.id;
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("default_discount_percent,default_commission_percent,min_payout_amount")
        .eq("id", 1)
        .maybeSingle();
      return data;
    },
  });

  const { data: marketer, isLoading: loadingMarketer } = useQuery({
    queryKey: ["marketer-row", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("marketers")
        .select("id,display_name,status,balance")
        .eq("user_id", uid!)
        .maybeSingle();
      return data;
    },
  });

  const { data: promo } = useQuery({
    queryKey: ["marketer-promo", marketer?.id],
    enabled: !!marketer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_codes")
        .select("id,code,discount_percent,commission_percent,uses_count,is_active")
        .eq("marketer_id", marketer!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["marketer-sales", marketer?.id],
    enabled: !!marketer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id,amount,commission,created_at,courses(title)")
        .eq("marketer_id", marketer!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ["marketer-payouts", marketer?.id],
    enabled: !!marketer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payouts")
        .select("id,amount,method,account_ref,status,created_at")
        .eq("marketer_id", marketer!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalCommission = (sales ?? []).reduce((s, r) => s + Number(r.commission), 0);
  const minPayout = Number(settings?.min_payout_amount ?? 1000);
  const balance = Number(marketer?.balance ?? 0);

  const refresh = () => qc.invalidateQueries();

  return (
    <MarketerShell title="لوحة المسوّق">
      <section className="overflow-hidden rounded-3xl surface-gradient p-6 text-primary-foreground sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
          <Sparkles className="size-3.5" /> برنامج المسوّقين
        </span>
        <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
          أهلًا {profile?.full_name || marketer?.display_name || "بك"} 👋
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 opacity-90">
          أنشئ كود الخصم الخاص بك وابدأ الربح من أول عملية شراء — خصم{" "}
          {Number(settings?.default_discount_percent ?? 10)}% للطالب وعمولة{" "}
          {Number(settings?.default_commission_percent ?? 10)}% لك على كل عملية.
        </p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Wallet} label="الرصيد المتاح" value={formatEGP(balance)} />
        <Stat icon={TrendingUp} label="إجمالي العمولات" value={formatEGP(totalCommission)} />
        <Stat icon={Users} label="عمليات الشراء بكودك" value={String((sales ?? []).length)} />
        <Stat
          icon={BadgePercent}
          label="حالة الحساب"
          value={marketer?.status === "approved" ? "مفعّل" : (marketer?.status ?? "—")}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {loadingMarketer ? null : promo ? (
          <CodeCard promo={promo} />
        ) : (
          <CreateCodeCard onDone={refresh} settings={settings} />
        )}

        <PayoutCard
          balance={balance}
          minPayout={minPayout}
          payouts={payouts ?? []}
          disabled={!marketer}
          onDone={refresh}
        />
      </div>

      <section className="mt-6 rounded-3xl card-soft p-5 sm:p-6">
        <h2 className="font-bold">سجل عمليات الشراء بكودك</h2>
        <p className="text-xs text-muted-foreground">كل عملية شراء تمت باستخدام كودك مع وقتها وعمولتك.</p>
        {(sales ?? []).length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">لا توجد عمليات شراء بعد.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(sales ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.courses?.title ?? "كورس"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("ar-EG")} — قيمة الشراء{" "}
                    {formatEGP(Number(s.amount))}
                  </p>
                </div>
                <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-bold text-success">
                  + {formatEGP(Number(s.commission))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MarketerShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl card-soft p-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function CreateCodeCard({
  onDone,
  settings,
}: {
  onDone: () => void;
  settings: { default_discount_percent: number; default_commission_percent: number } | null | undefined;
}) {
  const check = useServerFn(checkPromoCode);
  const claim = useServerFn(claimPromoCode);
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ available: boolean; reason: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onCheck() {
    setChecking(true);
    setState(null);
    try {
      const res = await check({ data: { code } });
      setState(res);
    } catch {
      toast.error("تعذر التحقق من الكود");
    } finally {
      setChecking(false);
    }
  }

  async function onClaim() {
    setSaving(true);
    try {
      await claim({ data: { code } });
      toast.success("تم تفعيل كودك بنجاح 🎉");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إنشاء الكود");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl card-soft p-6">
      <h2 className="text-lg font-bold">أنشئ كود الخصم الخاص بك</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        اختر كودًا سهل التذكّر (حروف إنجليزية وأرقام). سنتأكد أنه غير مستخدم من قبل.
      </p>

      <div className="mt-5 space-y-3">
        <Label htmlFor="promo">الكود المقترح</Label>
        <div className="flex gap-2">
          <Input
            id="promo"
            dir="ltr"
            placeholder="AHMED10"
            value={code}
            maxLength={20}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setState(null);
            }}
            className="font-mono tracking-widest"
          />
          <Button variant="outline" onClick={onCheck} disabled={checking || code.length < 3}>
            {checking ? <Loader2 className="size-4 animate-spin" /> : "تحقق"}
          </Button>
        </div>

        {state && (
          <p
            className={`flex items-center gap-2 text-sm ${
              state.available ? "text-success" : "text-destructive"
            }`}
          >
            {state.available ? <Check className="size-4" /> : <X className="size-4" />}
            {state.reason}
          </p>
        )}

        <div className="rounded-2xl bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">
          خصم {Number(settings?.default_discount_percent ?? 10)}% للطالب — عمولة{" "}
          {Number(settings?.default_commission_percent ?? 10)}% لك من أول عملية شراء. الكود صالح
          للاستخدام مرة واحدة لكل طالب.
        </div>

        <Button className="w-full" onClick={onClaim} disabled={saving || !state?.available}>
          {saving ? "جارٍ التفعيل..." : "تفعيل الكود"}
        </Button>
      </div>
    </section>
  );
}

function CodeCard({
  promo,
}: {
  promo: {
    code: string;
    discount_percent: number;
    commission_percent: number;
    uses_count: number;
    is_active: boolean;
  };
}) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="rounded-3xl card-soft p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">كودك الترويجي</h2>
        <Badge variant={promo.is_active ? "default" : "secondary"}>
          {promo.is_active ? "نشط" : "موقوف"}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/60 p-5">
        <span className="font-mono text-2xl font-bold tracking-[0.25em] text-primary" dir="ltr">
          {promo.code}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(promo.code);
            setCopied(true);
            toast.success("تم نسخ الكود");
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <Mini label="خصم الطالب" value={`${promo.discount_percent}%`} />
        <Mini label="عمولتك" value={`${promo.commission_percent}%`} />
        <Mini label="مرات الاستخدام" value={String(promo.uses_count ?? 0)} />
      </dl>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">
        الكود صالح لكل طالب مرة واحدة فقط، والعمولة تُحتسب من أول عملية شراء.
      </p>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}

function PayoutCard({
  balance,
  minPayout,
  payouts,
  disabled,
  onDone,
}: {
  balance: number;
  minPayout: number;
  disabled: boolean;
  payouts: {
    id: string;
    amount: number;
    method: string;
    account_ref: string | null;
    status: string;
    created_at: string;
  }[];
  onDone: () => void;
}) {
  const submit = useServerFn(requestPayout);
  const [amount, setAmount] = useState(String(minPayout));
  const [method, setMethod] = useState<"محفظة إلكترونية" | "انستاباي">("محفظة إلكترونية");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      await submit({ data: { amount: Number(amount), method, account } });
      toast.success("تم إرسال طلب السحب إلى الإدارة");
      setAccount("");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl card-soft p-6">
      <h2 className="text-lg font-bold">سحب الأرباح</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        الحد الأدنى للسحب {formatEGP(minPayout)} — رصيدك الحالي {formatEGP(balance)}.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>وسيلة الاستلام</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="محفظة إلكترونية">محفظة إلكترونية</SelectItem>
              <SelectItem value="انستاباي">انستاباي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">المبلغ (ج.م)</Label>
          <Input
            id="amount"
            type="number"
            dir="ltr"
            min={minPayout}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="account">رقم المحفظة أو حساب انستاباي</Label>
          <Input
            id="account"
            dir="ltr"
            placeholder="01xxxxxxxxx"
            value={account}
            maxLength={60}
            onChange={(e) => setAccount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            تستغرق مراجعة طلب السحب من 24 ساعة إلى 48 ساعة، وسيصلك التحويل بعد اعتماد الإدارة.
          </p>
        </div>
      </div>

      <Button
        className="mt-4 w-full"
        onClick={onSubmit}
        disabled={busy || disabled || account.trim().length < 5}
      >
        {busy ? "جارٍ الإرسال..." : "طلب سحب"}
      </Button>

      {payouts.length > 0 && (
        <ul className="mt-5 divide-y divide-border">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold">{formatEGP(Number(p.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  {p.method} — {new Date(p.created_at).toLocaleDateString("ar-EG")}
                </p>
              </div>
              <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                {p.status === "paid" ? "تم التحويل" : p.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
