import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, LifeBuoy, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { MarketerShell } from "@/components/marketer/MarketerShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { currentAcademicYear, useMarketer, useMarketerLevels, usePlatformSettings } from "@/lib/marketer-data";

export const Route = createFileRoute("/_marketer/marketer/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات والدعم | بوابة المسوّقين" },
      { name: "description", content: "بيانات حسابك كمسوّق، جدول المستويات والعمولات، وقنوات الدعم." },
      { property: "og:title", content: "الإعدادات والدعم | بوابة المسوّقين" },
      { property: "og:description", content: "معلومات الحساب والمستويات والدعم الفني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile } = useProfile();
  const { data: marketer } = useMarketer();
  const { data: levels } = useMarketerLevels();
  const { data: settings } = usePlatformSettings();

  const { data: logs } = useQuery({
    queryKey: ["marketer-logs", marketer?.id],
    enabled: !!marketer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("marketer_activity_logs")
        .select("id,action,details,created_at")
        .eq("marketer_id", marketer!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const year = currentAcademicYear(settings?.academic_year_start_month);
  const seasonCount = Number(marketer?.season_students ?? 0);

  return (
    <MarketerShell title="الإعدادات والدعم" subtitle={`العام الدراسي ${year}`}>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <section className="rounded-3xl card-frost p-6">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <h2 className="mt-3 font-bold">بيانات الحساب</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="الاسم" value={profile?.full_name || marketer?.display_name || "—"} />
              <Row label="الهاتف" value={marketer?.phone || profile?.phone || "—"} />
              <Row
                label="حالة الحساب"
                value={marketer?.status === "suspended" ? "موقوف" : "نشط"}
              />
              <Row label="طلاب هذا الموسم" value={String(seasonCount)} />
            </dl>
          </section>

          <section className="rounded-3xl card-violet-tint p-6">
            <span className="flex size-11 items-center justify-center rounded-2xl violet-gradient text-primary-foreground">
              <LifeBuoy className="size-5" />
            </span>
            <h2 className="mt-3 font-bold">الدعم</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              فريق الدعم متاح يوميًا من 10 صباحًا حتى 10 مساءً للرد على استفساراتك.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <a
                href="mailto:support@elmalek.app"
                className="flex items-center gap-2 rounded-xl bg-card/70 px-3 py-2 hover:bg-card"
              >
                <Mail className="size-4 text-primary" /> support@elmalek.app
              </a>
              <a
                href="https://wa.me/201000000000"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-card/70 px-3 py-2 hover:bg-card"
              >
                <MessageCircle className="size-4 text-primary" /> واتساب الدعم
              </a>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl card-graphite">
            <div className="flex items-center gap-2 border-b border-border p-5">
              <Crown className="size-5 text-gold" />
              <h2 className="font-bold">جدول المستويات والعمولات</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-start">المستوى</th>
                    <th className="p-3 text-start">عدد الطلاب</th>
                    <th className="p-3 text-start">العمولة</th>
                    <th className="p-3 text-start">الدرع</th>
                  </tr>
                </thead>
                <tbody>
                  {(levels ?? []).map((l) => {
                    const active =
                      seasonCount >= l.min_students &&
                      (l.max_students === null || seasonCount <= l.max_students);
                    return (
                      <tr
                        key={l.level}
                        className={`border-t border-border ${active ? "bg-primary-soft/60 font-semibold" : ""}`}
                      >
                        <td className="p-3">
                          {l.level}. {l.name}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {l.min_students.toLocaleString("ar-EG")}
                          {l.max_students ? ` — ${l.max_students.toLocaleString("ar-EG")}` : "+"}
                        </td>
                        <td className="p-3 text-primary">{l.commission_percent}%</td>
                        <td className="p-3 text-xs">{l.shield ? `🏆 ${l.shield}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl card-frost">
            <h2 className="border-b border-border p-5 font-bold">سجل نشاطك</h2>
            <ul className="divide-y divide-border">
              {(logs ?? []).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{l.action}</p>
                    {l.details && <p className="truncate text-xs text-muted-foreground">{l.details}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("ar-EG")}
                  </span>
                </li>
              ))}
              {(logs ?? []).length === 0 && (
                <li className="p-8 text-center text-muted-foreground">لا يوجد نشاط مسجّل بعد</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </MarketerShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card/60 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
