import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Shell } from "@/components/site/Shell";
import { PageHero } from "@/components/site/PageHero";
import { CourseCard, type CourseCardData } from "@/components/site/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, TRACKS, EDU_TYPES } from "@/lib/education";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "الكورسات | منصة المُلك التعليمية" },
      {
        name: "description",
        content:
          "تصفح كورسات المرحلة الإعدادية والثانوية في جميع المواد — عام وأزهري ولغات، علمي وأدبي.",
      },
      { property: "og:title", content: "الكورسات | منصة المُلك" },
      { property: "og:description", content: "كورسات منظمة بالفيديو والاختبارات لكل صف ومادة." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [track, setTrack] = useState<string | null>(null);
  const [eduType, setEduType] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,subject,stage,track,edu_type,price,is_free,cover_url,teachers(name,slug)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CourseCardData[];
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((c) => {
      if (stage && c.stage !== stage) return false;
      if (track && c.track !== track) return false;
      if (eduType && c.edu_type !== eduType) return false;
      if (q.trim() && !`${c.title} ${c.subject}`.includes(q.trim())) return false;
      return true;
    });
  }, [data, stage, track, eduType, q]);

  return (
    <Shell title="الكورسات">
      <PageHero title="الكورسات" subtitle="اختر صفك وشعبتك واعثر على الكورس المناسب لك." />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-4 rounded-2xl card-soft p-4">
          <Input
            placeholder="ابحث باسم الكورس أو المادة..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
          />
          <FilterRow label="الصف" value={stage} onChange={setStage} options={STAGES} />
          <FilterRow label="الشعبة" value={track} onChange={setTrack} options={TRACKS} />
          <FilterRow label="النظام" value={eduType} onChange={setEduType} options={EDU_TYPES} />
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">جارٍ تحميل الكورسات...</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">لا توجد كورسات مطابقة لبحثك.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}:</span>
      <Button
        size="sm"
        variant={value === null ? "default" : "outline"}
        onClick={() => onChange(null)}
      >
        الكل
      </Button>
      {options.map((o) => (
        <Button
          key={o}
          size="sm"
          variant={value === o ? "default" : "outline"}
          onClick={() => onChange(o)}
        >
          {o}
        </Button>
      ))}
    </div>
  );
}
