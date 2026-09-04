import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { MarketerShell } from "@/components/marketer/MarketerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEGP } from "@/lib/education";
import { requestPayout } from "@/lib/marketer.functions";
import { useMarketer, usePayouts, usePlatformSettings, useSales } from "@/lib/marketer-data";

export const Route = createFileRoute("/_marketer/marketer/earnings")({
  head: () => ({
    meta: [
      { title: "الأرباح والسحوبات | بوابة المسوّقين" },
      { name: "description", content: "تابع رصيدك، اطلب سحب أرباحك، واستعرض سجل السحوبات السابقة." },
      { property: "og:title", content: "الأرباح والسحوبات | بوابة المسوّقين" },
      { property: "og:description", content: "إدارة أرباحك وطلبات السحب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EarningsPage,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-gold/20 text-gold-foreground" },
  approved: { label: "تم التحويل", cls: "bg-success/10 text-success" },
  rejected: { label: "مرفوض", cls: "bg-destructive/10 text-destructive" },
};

function EarningsPage() {
  const qc = useQueryClient();
  const { data: marketer } = useMarketer();
  const { data: payouts } = usePayouts(marketer?.id);
  const { data: sales } = useSales(marketer?.id);
  const { data: settings } = usePlatformSettings();
  const payout = useServerFn(requestPayout);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"محفظة إلكترونية" | "انستاباي">("محفظة إلكترونية");
  const [account, setAccount] = useState("");

  const minPayout = Number(settings?.min_payout_amount ?? 1000);
  const balance = Number(marketer?.balance ?? 0);
  const totalEarned = (sales ?? []).reduce((s, r) => s + Number(r.commission), 0);
  const withdrawn = (payouts ?? [])
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + Number(p.amount), 0);

  const mut = useMutation({
    mutationFn: async () =>
      payout({ data: { amount: Number(amount), method, account: account.trim() } }),
    onSuccess: () => {
      toast.success("تم إرسال طلب السحب للإدارة");
      setAmount("");
      setAccount("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MarketerShell title="الأرباح والسحوبات" subtitle="أرباحك في متناول يدك">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl card-violet-tint p-5">
          <p className="text-xs text-muted-foreground">الرصيد المتاح</p>
          <p className="mt-1 text-2xl font-black text-primary">{formatEGP(balance)}</p>
        </div>
        <div className="rounded-3xl card-frost p-5">
          <p className="text-xs text-muted-foreground">إجمالي ما ربحته</p>
          <p className="mt-1 text-2xl font-bold">{formatEGP(totalEarned)}</p>
        </div>
        <div className="rounded-3xl card-graphite p-5">
          <p className="text-xs text-muted-foreground">إجمالي المسحوب</p>
          <p className="mt-1 text-2xl font-bold">{formatEGP(withdrawn)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <section className="rounded-3xl card-outline-gradient p-6">
          <span className="flex size-11 items-center justify-center rounded-2xl violet-gradient text-primary-foreground">
            <Wallet className="size-5" />
          </span>
          <h2 className="mt-3 font-bold">طلب سحب</h2>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>وسيلة الاستلام</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["محفظة إلكترونية", "انستاباي"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                      method === m
                        ? "border-primary bg-primary-soft font-semibold text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc">
                {method === "انستاباي" ? "حساب انستاباي" : "رقم المحفظة الإلكترونية"}
              </Label>
              <Input
                id="acc"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={method === "انستاباي" ? "username@instapay" : "01xxxxxxxxx"}
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amt">المبلغ</Label>
              <Input
                id="amt"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(minPayout)}
              />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> الحد الأدنى {formatEGP(minPayout)} — تستغرق المراجعة من 24
                إلى 48 ساعة.
              </p>
            </div>

            <Button
              className="w-full"
              disabled={mut.isPending || !amount || !account.trim()}
              onClick={() => mut.mutate()}
            >
              {mut.isPending && <Loader2 className="size-4 animate-spin" />} إرسال الطلب
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl card-graphite">
          <h2 className="border-b border-border p-5 font-bold">سجل السحوبات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-start">المبلغ</th>
                  <th className="p-3 text-start">الوسيلة</th>
                  <th className="p-3 text-start">الحساب</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {(payouts ?? []).map((p) => {
                  const st = STATUS[p.status] ?? STATUS["pending"]!;
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3 font-bold">{formatEGP(Number(p.amount))}</td>
                      <td className="p-3">{p.method}</td>
                      <td className="p-3 text-xs" dir="ltr">
                        {p.account_ref}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  );
                })}
                {(payouts ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      لا توجد طلبات سحب بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MarketerShell>
  );
}
