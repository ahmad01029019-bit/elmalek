import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Crown,
  Sparkles,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { MarketerShell } from "@/components/marketer/MarketerShell";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/auth";
import { formatEGP } from "@/lib/education";
import { levelProgress } from "@/lib/marketer-levels";
import {
  buildSeries,
  useMarketer,
  useMarketerLevels,
  useOffers,
  usePromo,
  useSales,
} from "@/lib/marketer-data";

export const Route = createFileRoute("/_marketer/marketer/")({
  head: () => ({
    meta: [
      { title: "لوحة المسوّق | منصة المُلك" },
      {
        name: "description",
        content: "نظرة سريعة على أدائك: العمولات، المستوى الحالي، أحدث العروض، والرسوم البيانية.",
      },
      { property: "og:title", content: "لوحة المسوّق | منصة المُلك" },
      { property: "og:description", content: "أداؤك التسويقي ومستواك وأرباحك في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketerHome,
});

function MarketerHome() {
  const { data: profile } = useProfile();
  const { data: marketer } = useMarketer();
  const { data: promo } = usePromo(marketer?.id);
  const { data: sales } = useSales(marketer?.id);
  const { data: levels } = useMarketerLevels();
  const { data: offers } = useOffers();

  const series = useMemo(() => buildSeries(sales ?? [], "daily"), [sales]);
  const totalCommission = (sales ?? []).reduce((s, r) => s + Number(r.commission), 0);
  const seasonCount = Number(marketer?.season_students ?? 0);
  const prog = levelProgress(levels ?? [], seasonCount);

  return (
    <MarketerShell
      title={`أهلًا ${profile?.full_name || marketer?.display_name || "بك"} 👋`}
      subtitle="لمحة سريعة عن أدائك التسويقي هذا الموسم"
    >
      <OffersSlider offers={offers ?? []} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          tone="violet"
          icon={Wallet}
          label="الرصيد المتاح"
          value={formatEGP(Number(marketer?.balance ?? 0))}
        />
        <Stat tone="frost" icon={TrendingUp} label="إجمالي العمولات" value={formatEGP(totalCommission)} />
        <Stat tone="graphite" icon={Users} label="عمليات الشراء بكودك" value={String((sales ?? []).length)} />
        <Stat
          tone="outline"
          icon={Crown}
          label="المستوى الحالي"
          value={prog.current ? `${prog.current.level} — ${prog.current.commission_percent}%` : "—"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl card-frost p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold">أداء آخر 14 يومًا</h2>
              <p className="text-xs text-muted-foreground">مقارنة بالفترة السابقة</p>
            </div>
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                series.change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {series.change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {series.change}%
            </span>
          </div>
          <div className="mt-4 h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.points}>
                <defs>
                  <linearGradient id="mkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    direction: "rtl",
                  }}
                  formatter={(v: number) => [formatEGP(Number(v)), "العمولة"]}
                />
                <Area
                  type="monotone"
                  dataKey="commission"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#mkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl card-violet-tint p-5 sm:p-6">
          <h2 className="font-bold">تقدّمك نحو المستوى التالي</h2>
          <div className="mt-5 flex flex-col items-center">
            <ProgressRing percent={prog.percent} label={`${seasonCount}`} caption="طالب هذا الموسم" />
            <p className="mt-4 text-center text-sm font-semibold">{prog.current?.name ?? "—"}</p>
            {prog.next ? (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                باقي {prog.remaining} طالب للوصول إلى «{prog.next.name}» بعمولة {prog.next.commission_percent}%
              </p>
            ) : (
              <p className="mt-1 text-center text-xs text-muted-foreground">وصلت إلى أعلى مستوى 👑</p>
            )}
            {prog.current?.shield && (
              <span className="mt-3 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-foreground">
                🏆 {prog.current.shield}
              </span>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction to="/marketer/links" icon={Ticket} title="كودك الترويجي" text={promo?.code ?? "أنشئ كودك الآن"} />
        <QuickAction to="/marketer/reports" icon={BadgeCheck} title="التقارير" text="سجل عمليات الشراء والمستويات" />
        <QuickAction to="/marketer/earnings" icon={Wallet} title="طلب سحب" text="اسحب أرباحك بسهولة" />
        <QuickAction to="/marketer/demo" icon={Sparkles} title="حساب تجريبي" text="اعرض المنصة للطلاب" />
      </section>
    </MarketerShell>
  );
}

function OffersSlider({
  offers,
}: {
  offers: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    link_url: string | null;
    badge: string | null;
    gradient: string;
  }[];
}) {
  const [i, setI] = useState(0);
  const list = offers.length
    ? offers
    : [
        {
          id: "default",
          title: "ابدأ الربح من أول عملية",
          description: "شارك كودك مع الطلاب واحصل على عمولتك فورًا مع كل عملية شراء.",
          image_url: null,
          link_url: null,
          badge: "عرض",
          gradient: "violet",
        },
      ];

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % list.length), 5000);
    return () => clearInterval(t);
  }, [list.length]);

  const active = list[Math.min(i, list.length - 1)]!;
  const gradClass =
    active.gradient === "ocean"
      ? "offer-gradient-ocean"
      : active.gradient === "sunset"
        ? "offer-gradient-sunset"
        : active.gradient === "forest"
          ? "offer-gradient-forest"
          : "offer-gradient-violet";

  const content = (
    <div className={`relative overflow-hidden rounded-3xl ${gradClass} p-6 text-primary-foreground sm:p-8`}>
      {active.image_url && (
        <img
          src={active.image_url}
          alt={active.title}
          loading="lazy"
          className="absolute inset-0 size-full object-cover opacity-30"
        />
      )}
      <div className="relative">
        {active.badge && (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="size-3.5" /> {active.badge}
          </span>
        )}
        <h2 className="mt-3 text-xl font-bold sm:text-2xl">{active.title}</h2>
        {active.description && (
          <p className="mt-2 max-w-2xl text-sm leading-7 opacity-90">{active.description}</p>
        )}
      </div>
    </div>
  );

  return (
    <section className="relative">
      {active.link_url ? (
        <a href={active.link_url} target="_blank" rel="noreferrer" className="block">
          {content}
        </a>
      ) : (
        content
      )}

      {list.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setI((v) => (v - 1 + list.length) % list.length)}>
            <ChevronRight className="size-4" />
          </Button>
          {list.map((o, idx) => (
            <button
              key={o.id}
              aria-label={`عرض ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-2 bg-border"}`}
            />
          ))}
          <Button size="icon" variant="ghost" onClick={() => setI((v) => (v + 1) % list.length)}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      )}
    </section>
  );
}

export function Stat({
  icon: Icon,
  label,
  value,
  tone = "frost",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "frost" | "graphite" | "violet" | "outline";
}) {
  const cls =
    tone === "violet"
      ? "card-violet-tint"
      : tone === "graphite"
        ? "card-graphite"
        : tone === "outline"
          ? "card-outline-gradient"
          : "card-frost";
  return (
    <div className={`rounded-3xl ${cls} p-5`}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function ProgressRing({ percent, label, caption }: { percent: number; label: string; caption: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, percent)) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{label}</span>
        <span className="text-[11px] text-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  text,
}: {
  to: string;
  icon: typeof Wallet;
  title: string;
  text: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-3xl card-graphite p-5 transition-transform hover:-translate-y-0.5"
    >
      <span className="flex size-10 items-center justify-center rounded-xl violet-gradient text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{text}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
        فتح <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
      </span>
    </Link>
  );
}
