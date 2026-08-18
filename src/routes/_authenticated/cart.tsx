import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { formatEGP } from "@/lib/education";
import { checkoutCart } from "@/lib/checkout.functions";
import { Trash2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "سلة الكورسات | منصة المُلك" },
      { name: "description", content: "راجع كورساتك المختارة وطبّق كود الخصم قبل إتمام الشراء." },
      { property: "og:title", content: "سلة الكورسات | منصة المُلك" },
      { property: "og:description", content: "إتمام الشراء من رصيد المحفظة." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { session } = useSession();
  const { data: profile } = useProfile();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const runCheckout = useServerFn(checkoutCart);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["cart", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id,course_id,courses(id,title,price,is_free,subject)")
        .eq("student_id", uid!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = (items ?? []).reduce(
    (s, i) => s + (i.courses?.is_free ? 0 : Number(i.courses?.price ?? 0)),
    0,
  );

  async function removeItem(id: string) {
    await supabase.from("cart_items").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["cart"] });
  }

  async function pay() {
    setBusy(true);
    try {
      const res = await runCheckout({ data: code.trim() ? { code: code.trim() } : {} });
      toast.success(`تم شراء ${res.count} كورس بمبلغ ${formatEGP(res.total)}`);
      await qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إتمام الشراء");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="سلة الكورسات">
      {(items ?? []).length === 0 ? (
        <div className="rounded-2xl card-soft p-10 text-center">
          <ShoppingCart className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">السلة فارغة.</p>
          <Button asChild className="mt-4">
            <Link to="/courses">تصفح الكورسات</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {(items ?? []).map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-2xl card-soft p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.courses?.title}</p>
                  <p className="text-xs text-muted-foreground">{i.courses?.subject}</p>
                </div>
                <span className="text-sm font-bold">
                  {i.courses?.is_free ? "مجاني" : formatEGP(Number(i.courses?.price ?? 0))}
                </span>
                <button
                  onClick={() => removeItem(i.id)}
                  className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                  aria-label="حذف"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>

          <aside className="h-fit space-y-4 rounded-2xl card-soft p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الإجمالي</span>
              <span className="font-bold">{formatEGP(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">رصيد المحفظة</span>
              <span>{formatEGP(profile?.wallet_balance ?? 0)}</span>
            </div>
            <Input
              placeholder="كود الخصم (اختياري)"
              value={code}
              maxLength={40}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button className="w-full" onClick={pay} disabled={busy}>
              {busy ? "جارٍ الدفع..." : "إتمام الشراء"}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/wallet">شحن المحفظة</Link>
            </Button>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
