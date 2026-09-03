import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Link2, Loader2, Percent, Ticket } from "lucide-react";
import { toast } from "sonner";
import { MarketerShell } from "@/components/marketer/MarketerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePromoCode,
  checkPromoCode,
  claimPromoCode,
  updateMarketerOffset,
} from "@/lib/marketer.functions";
import { useMarketer, usePlatformSettings, usePromo } from "@/lib/marketer-data";

export const Route = createFileRoute("/_marketer/marketer/links")({
  head: () => ({
    meta: [
      { title: "الروابط والكوبونات | بوابة المسوّقين" },
      { name: "description", content: "أنشئ كودك الترويجي، انسخ رابط الإحالة، وتحكّم في نسبة الخصم." },
      { property: "og:title", content: "الروابط والكوبونات | بوابة المسوّقين" },
      { property: "og:description", content: "إدارة كود الخصم ورابط الإحالة الخاص بك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LinksPage,
});

function LinksPage() {
  const qc = useQueryClient();
  const { data: marketer } = useMarketer();
  const { data: promo } = usePromo(marketer?.id);
  const { data: settings } = usePlatformSettings();

  const check = useServerFn(checkPromoCode);
  const claim = useServerFn(claimPromoCode);
  const change = useServerFn(changePromoCode);
  const setOffset = useServerFn(updateMarketerOffset);

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ available: boolean; reason: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [offset, setOffsetValue] = useState(0);

  useEffect(() => {
    if (marketer) setOffsetValue(Number(marketer.discount_offset ?? 0));
  }, [marketer]);

  useEffect(() => {
    if (code.trim().length < 3) {
      setStatus(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await check({ data: { code } });
        setStatus(res);
      } finally {
        setChecking(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [code, check]);

  const claimMut = useMutation({
    mutationFn: async () => (promo ? change({ data: { code } }) : claim({ data: { code } })),
    onSuccess: () => {
      toast.success(promo ? "تم تغيير الكود بنجاح" : "تم إنشاء كودك بنجاح 🎉");
      setCode("");
      setStatus(null);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const offsetMut = useMutation({
    mutationFn: async () => setOffset({ data: { offset } }),
    onSuccess: () => {
      toast.success("تم تحديث نسبة الخصم الإضافية");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const baseDiscount = Number(promo?.discount_percent ?? settings?.default_discount_percent ?? 10);
  const studentDiscount = Math.max(0, Math.min(90, baseDiscount + offset));
  const referralLink =
    typeof window !== "undefined" && promo?.code
      ? `${window.location.origin}/courses?code=${promo.code}`
      : "";

  return (
    <MarketerShell title="الروابط والكوبونات" subtitle="كودك هو مفتاح أرباحك">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl card-violet-tint p-6">
          <span className="flex size-11 items-center justify-center rounded-2xl violet-gradient text-primary-foreground">
            <Ticket className="size-5" />
          </span>
          <h2 className="mt-3 font-bold">{promo ? "كودك الحالي" : "أنشئ كودك الترويجي"}</h2>

          {promo && (
            <div className="mt-4 rounded-2xl bg-card/70 p-4 text-center">
              <p className="font-display text-3xl font-black tracking-widest text-primary">{promo.code}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                خصم {studentDiscount}% للطالب · استُخدم {promo.uses_count} مرة
              </p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Label htmlFor="code">{promo ? "تغيير الكود" : "اختر كودك"}</Label>
            <Input
              id="code"
              value={code}
              maxLength={20}
              placeholder="MALEK2026"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center font-bold tracking-widest"
            />
            {checking && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> جارٍ التحقق…
              </p>
            )}
            {status && !checking && (
              <p className={`text-xs ${status.available ? "text-success" : "text-destructive"}`}>
                {status.reason}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!status?.available || claimMut.isPending}
              onClick={() => claimMut.mutate()}
            >
              {claimMut.isPending && <Loader2 className="size-4 animate-spin" />}
              {promo ? "تغيير الكود" : "تفعيل الكود"}
            </Button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl card-frost p-6">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Link2 className="size-5" />
            </span>
            <h2 className="mt-3 font-bold">رابط الإحالة</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              شارك هذا الرابط ليصل الطالب مباشرة للكورسات مع كودك جاهزًا.
            </p>
            <div className="mt-4 flex gap-2">
              <Input readOnly value={referralLink || "أنشئ كودك أولًا"} dir="ltr" className="text-xs" />
              <Button
                variant="secondary"
                disabled={!referralLink}
                onClick={async () => {
                  await navigator.clipboard.writeText(referralLink);
                  setCopied(true);
                  toast.success("تم نسخ الرابط");
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </section>

          <section className="rounded-3xl card-graphite p-6">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Percent className="size-5" />
            </span>
            <h2 className="mt-3 font-bold">إزاحة الخصم</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              يمكنك التنازل عن جزء من عمولتك لزيادة خصم الطالب، أو تقليل الخصم لصالح عمولتك (من -20% إلى
              +20%).
            </p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={offset}
                onChange={(e) => setOffsetValue(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
              />
              <span className="w-16 rounded-lg bg-primary-soft px-2 py-1 text-center text-sm font-bold text-primary">
                {offset > 0 ? `+${offset}` : offset}%
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              خصم الطالب النهائي: <strong className="text-foreground">{studentDiscount}%</strong>
            </p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              disabled={offsetMut.isPending}
              onClick={() => offsetMut.mutate()}
            >
              {offsetMut.isPending && <Loader2 className="size-4 animate-spin" />} حفظ
            </Button>
          </section>
        </div>
      </div>
    </MarketerShell>
  );
}
