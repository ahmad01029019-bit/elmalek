import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { formatEGP } from "@/lib/education";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "المحفظة | منصة المُلك" },
      { name: "description", content: "رصيد محفظتك وسجل المعاملات وشحن الرصيد على منصة المُلك." },
      { property: "og:title", content: "المحفظة | منصة المُلك" },
      { property: "og:description", content: "إدارة رصيدك ومعاملاتك." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { session } = useSession();
  const { data: profile } = useProfile();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);

  const { data: txs } = useQuery({
    queryKey: ["wallet-txs", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("id,amount,kind,description,created_at")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function topUp() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 100000) {
      toast.error("أدخل مبلغًا صحيحًا");
      return;
    }
    setBusy(true);
    try {
      const next = Number(profile?.wallet_balance ?? 0) + value;
      const { error } = await supabase
        .from("profiles")
        .update({ wallet_balance: next })
        .eq("id", uid!);
      if (error) throw error;
      await supabase.from("wallet_transactions").insert({
        user_id: uid!,
        amount: value,
        kind: "topup",
        description: "شحن رصيد (تجريبي)",
      });
      await qc.invalidateQueries();
      toast.success("تم شحن المحفظة");
    } catch {
      toast.error("تعذر شحن المحفظة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="المحفظة">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit space-y-4 rounded-2xl card-soft p-6">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Wallet className="size-6" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
            <p className="text-2xl font-bold">{formatEGP(profile?.wallet_balance ?? 0)}</p>
          </div>
          <div className="space-y-2">
            <Input
              type="number"
              dir="ltr"
              min={1}
              max={100000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button className="w-full" onClick={topUp} disabled={busy}>
              شحن الرصيد
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              الشحن تجريبي حاليًا لحين ربط بوابة الدفع.
            </p>
          </div>
        </aside>

        <section className="rounded-2xl card-soft p-5">
          <h2 className="font-bold">سجل المعاملات</h2>
          {(txs ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">لا توجد معاملات بعد.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {(txs ?? []).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      t.amount >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {t.amount >= 0 ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t.description ?? t.kind}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("ar-EG")}
                    </p>
                  </div>
                  <span className="text-sm font-bold">{formatEGP(Math.abs(t.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
