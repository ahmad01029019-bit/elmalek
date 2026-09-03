import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { academicYearLabel, type MarketerLevel } from "@/lib/marketer-levels";

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
}

export function useMarketerLevels() {
  return useQuery({
    queryKey: ["marketer-levels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketer_levels")
        .select("level,name,min_students,max_students,commission_percent,shield")
        .order("level");
      return (data ?? []) as MarketerLevel[];
    },
  });
}

/** صف المسوّق الحالي (أو مسوّق محدد عندما يعاينه المدير). */
export function useMarketer(overrideId?: string) {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ["marketer-row", overrideId ?? uid],
    enabled: !!(overrideId || uid),
    queryFn: async () => {
      const q = supabase
        .from("marketers")
        .select("id,display_name,status,balance,season_students,season_year,level,discount_offset,phone,user_id");
      const { data } = overrideId
        ? await q.eq("id", overrideId).maybeSingle()
        : await q.eq("user_id", uid!).maybeSingle();
      return data;
    },
  });
}

export function usePromo(marketerId?: string) {
  return useQuery({
    queryKey: ["marketer-promo", marketerId],
    enabled: !!marketerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_codes")
        .select("id,code,discount_percent,commission_percent,uses_count,is_active")
        .eq("marketer_id", marketerId!)
        .maybeSingle();
      return data;
    },
  });
}

export function useSales(marketerId?: string) {
  return useQuery({
    queryKey: ["marketer-sales", marketerId],
    enabled: !!marketerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id,amount,commission,created_at,is_new_customer,level_at_time,courses(title)")
        .eq("marketer_id", marketerId!)
        .order("created_at", { ascending: false })
        .limit(300);
      return data ?? [];
    },
  });
}

export function usePayouts(marketerId?: string) {
  return useQuery({
    queryKey: ["marketer-payouts", marketerId],
    enabled: !!marketerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("payouts")
        .select("id,amount,method,account_ref,status,created_at")
        .eq("marketer_id", marketerId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useOffers() {
  return useQuery({
    queryKey: ["marketer-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketer_offers")
        .select("*")
        .eq("is_active", true)
        .order("position");
      return data ?? [];
    },
  });
}

/** يبني سلسلة زمنية للأداء (يومي/أسبوعي/شهري) مع مقارنة الفترة السابقة. */
export function buildSeries(
  sales: { created_at: string; commission: number | string }[],
  range: "daily" | "weekly" | "monthly",
) {
  const buckets = range === "daily" ? 14 : range === "weekly" ? 8 : 6;
  const now = new Date();
  const points: { label: string; commission: number; count: number; start: number; end: number }[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const start = new Date(now);
    const end = new Date(now);
    if (range === "daily") {
      start.setDate(now.getDate() - i);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime() + 86400000);
      points.push({ label: start.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }), commission: 0, count: 0, start: start.getTime(), end: end.getTime() });
    } else if (range === "weekly") {
      start.setDate(now.getDate() - i * 7 - 6);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime() + 7 * 86400000);
      points.push({ label: `أسبوع ${buckets - i}`, commission: 0, count: 0, start: start.getTime(), end: end.getTime() });
    } else {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      points.push({ label: s.toLocaleDateString("ar-EG", { month: "long" }), commission: 0, count: 0, start: s.getTime(), end: e.getTime() });
    }
  }

  for (const s of sales) {
    const t = new Date(s.created_at).getTime();
    const p = points.find((x) => t >= x.start && t < x.end);
    if (p) {
      p.commission += Number(s.commission);
      p.count += 1;
    }
  }

  const half = Math.floor(points.length / 2);
  const prev = points.slice(0, half).reduce((a, b) => a + b.commission, 0);
  const curr = points.slice(half).reduce((a, b) => a + b.commission, 0);
  const change = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

  return { points, prev, curr, change };
}

export function currentAcademicYear(startMonth?: number) {
  return academicYearLabel(Number(startMonth ?? 9));
}
