import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { MarketerShell } from "@/components/marketer/MarketerShell";
import { Button } from "@/components/ui/button";
import { formatEGP } from "@/lib/education";
import { buildSeries, useMarketer, useSales } from "@/lib/marketer-data";

export const Route = createFileRoute("/_marketer/marketer/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والإحصائيات | بوابة المسوّقين" },
      { name: "description", content: "تقارير يومية وأسبوعية وشهرية لأداء كودك التسويقي وعمولاتك." },
      { property: "og:title", content: "التقارير والإحصائيات | بوابة المسوّقين" },
      { property: "og:description", content: "تحليل مفصّل لعمليات الشراء والعمولات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const RANGES = [
  { id: "daily", label: "يومي" },
  { id: "weekly", label: "أسبوعي" },
  { id: "monthly", label: "شهري" },
] as const;

function ReportsPage() {
  const { data: marketer } = useMarketer();
  const { data: sales } = useSales(marketer?.id);
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("weekly");

  const series = useMemo(() => buildSeries(sales ?? [], range), [sales, range]);
  const newCount = (sales ?? []).filter((s) => s.is_new_customer).length;
  const repeatCount = (sales ?? []).length - newCount;

  const pieData = [
    { name: "عملاء جدد", value: newCount },
    { name: "عملاء متكررون", value: repeatCount },
  ];
  const colors = ["var(--primary)", "var(--accent)"];

  return (
    <MarketerShell title="التقارير والإحصائيات" subtitle="تابع أداءك بالتفصيل">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={range === r.id ? "default" : "secondary"}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </Button>
        ))}
        <span
          className={`ms-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
            series.change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {series.change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {series.change}% مقارنة بالفترة السابقة
        </span>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl card-frost p-5 sm:p-6">
          <h2 className="font-bold">العمولات</h2>
          <div className="mt-4 h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.points}>
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
                <Bar dataKey="commission" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl card-violet-tint p-5 sm:p-6">
          <h2 className="font-bold">نوع العملاء</h2>
          <div className="mt-2 h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={colors[i]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ direction: "rtl", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    direction: "rtl",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl card-graphite">
        <h2 className="border-b border-border p-5 font-bold">سجل عمليات الشراء</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-start">الكورس</th>
                <th className="p-3 text-start">المبلغ</th>
                <th className="p-3 text-start">عمولتك</th>
                <th className="p-3 text-start">نوع العميل</th>
                <th className="p-3 text-start">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {(sales ?? []).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">{s.courses?.title ?? "—"}</td>
                  <td className="p-3">{formatEGP(Number(s.amount))}</td>
                  <td className="p-3 font-bold text-primary">{formatEGP(Number(s.commission))}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        s.is_new_customer ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.is_new_customer ? "جديد" : "متكرر"}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
              {(sales ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    لا توجد عمليات شراء بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </MarketerShell>
  );
}
