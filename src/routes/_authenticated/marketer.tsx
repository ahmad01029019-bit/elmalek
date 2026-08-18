import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatEGP } from "@/lib/education";

export const Route = createFileRoute("/_authenticated/marketer")({
  head: () => ({
    meta: [
      { title: "لوحة المسوق | منصة المُلك" },
      { name: "description", content: "أكواد الخصم الخاصة بك وعمولاتك من مبيعات كورسات منصة المُلك." },
      { property: "og:title", content: "لوحة المسوق | منصة المُلك" },
      { property: "og:description", content: "تابع أكوادك وأرباحك." },
    ],
  }),
  component: MarketerPage,
});

function MarketerPage() {
  const { session } = useSession();
  const uid = session?.user.id;

  const { data: codes } = useQuery({
    queryKey: ["marketer-codes", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_codes")
        .select("id,code,discount_percent,uses_count,is_active")
        .eq("marketer_id", uid!);
      return data ?? [];
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["marketer-commissions", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions")
        .select("id,amount,status,created_at")
        .eq("marketer_id", uid!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const total = (commissions ?? []).reduce((s, c) => s + Number(c.amount), 0);

  return (
    <AppShell title="لوحة المسوق">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="إجمالي العمولات" value={formatEGP(total)} />
        <Card label="عدد الأكواد" value={String((codes ?? []).length)} />
        <Card
          label="إجمالي الاستخدامات"
          value={String((codes ?? []).reduce((s, c) => s + (c.uses_count ?? 0), 0))}
        />
      </div>

      <section className="mt-6 rounded-2xl card-soft p-5">
        <h2 className="font-bold">أكواد الخصم</h2>
        {(codes ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لم يتم إنشاء أكواد بعد. تواصل مع الإدارة لتفعيل كودك.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {(codes ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-mono font-bold" dir="ltr">
                  {c.code}
                </span>
                <span className="text-muted-foreground">خصم {c.discount_percent}%</span>
                <Badge variant={c.is_active ? "default" : "secondary"}>
                  {c.uses_count ?? 0} استخدام
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl card-soft p-5">
        <h2 className="font-bold">سجل العمولات</h2>
        {(commissions ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد عمولات بعد.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {(commissions ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span>{new Date(c.created_at).toLocaleDateString("ar-EG")}</span>
                <Badge variant="outline">{c.status}</Badge>
                <span className="font-bold">{formatEGP(Number(c.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl card-soft p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
