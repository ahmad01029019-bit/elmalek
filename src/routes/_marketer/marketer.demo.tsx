import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Loader2, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MarketerShell } from "@/components/marketer/MarketerShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { YouTube } from "@/components/YouTube";
import { EDU_TYPES, STAGES, TRACKS, formatEGP } from "@/lib/education";
import { demoStudentContent, logMarketerActivity } from "@/lib/marketer.functions";

export const Route = createFileRoute("/_marketer/marketer/demo")({
  head: () => ({
    meta: [
      { title: "حساب طالب تجريبي | بوابة المسوّقين" },
      { name: "description", content: "استعرض تجربة الطالب الكاملة داخل المنصة لعرضها على عملائك." },
      { property: "og:title", content: "حساب طالب تجريبي | بوابة المسوّقين" },
      { property: "og:description", content: "جولة داخل حساب الطالب بكل الكورسات والدروس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

type Course = {
  id: string;
  title: string;
  subject: string;
  stage: string;
  price: number;
  is_free: boolean;
  cover_url: string | null;
  teachers?: { name: string } | null;
};
type Lesson = { id: string; course_id: string; title: string; youtube_id: string | null };

function DemoPage() {
  const load = useServerFn(demoStudentContent);
  const log = useServerFn(logMarketerActivity);

  const [stage, setStage] = useState<string>(STAGES[0]);
  const [track, setTrack] = useState<string>(TRACKS[0]);
  const [eduType, setEduType] = useState<string>(EDU_TYPES[0]);
  const [active, setActive] = useState<string | null>(null);

  const isPrep = stage.includes("الإعدادي");

  const mut = useMutation({
    mutationFn: async () =>
      (await load({ data: { stage, track: isPrep ? null : track, eduType } })) as {
        courses: Course[];
        lessons: Lesson[];
      },
    onSuccess: () => {
      void log({ data: { action: "فتح حساب طالب تجريبي", details: `${stage} — ${eduType}` } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const courses = mut.data?.courses ?? [];
  const lessons = mut.data?.lessons ?? [];
  const activeLessons = lessons.filter((l) => l.course_id === active);

  return (
    <MarketerShell title="حساب طالب تجريبي" subtitle="اعرض تجربة المنصة كاملة أمام عملائك">
      <section className="rounded-3xl card-violet-tint p-6">
        <span className="flex size-11 items-center justify-center rounded-2xl violet-gradient text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        <h2 className="mt-3 font-bold">اختر بيانات الطالب</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>الصف</Label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
            >
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {!isPrep && (
            <div className="space-y-2">
              <Label>الشعبة</Label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                {TRACKS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>نوع التعليم</Label>
            <select
              value={eduType}
              onChange={(e) => setEduType(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
            >
              {EDU_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <Button
          className="mt-4"
          disabled={mut.isPending}
          onClick={() => {
            setActive(null);
            mut.mutate();
          }}
        >
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          دخول الحساب التجريبي
        </Button>
      </section>

      {mut.isSuccess && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
          <section className="rounded-3xl card-frost p-5">
            <h2 className="font-bold">كل الكورسات المتاحة ({courses.length})</h2>
            <ul className="mt-4 space-y-2">
              {courses.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActive(c.id)}
                    className={`w-full rounded-2xl border p-3 text-start transition-colors ${
                      active === c.id
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.subject} · {c.teachers?.name ?? "—"} ·{" "}
                      {c.is_free ? "مجاني" : formatEGP(Number(c.price))}
                    </p>
                  </button>
                </li>
              ))}
              {courses.length === 0 && (
                <li className="p-6 text-center text-muted-foreground">لا توجد كورسات لهذا الاختيار</li>
              )}
            </ul>
          </section>

          <section className="rounded-3xl card-graphite p-5">
            <h2 className="font-bold">الدروس</h2>
            {!active && <p className="mt-4 text-sm text-muted-foreground">اختر كورسًا لعرض دروسه.</p>}
            {active && (
              <ul className="mt-4 space-y-3">
                {activeLessons.map((l) => (
                  <li key={l.id} className="rounded-2xl border border-border p-3">
                    <p className="flex items-center gap-2 font-semibold">
                      <PlayCircle className="size-4 text-primary" /> {l.title}
                    </p>
                    {l.youtube_id && (
                      <div className="mt-3 overflow-hidden rounded-xl">
                        <YouTube id={l.youtube_id} title={l.title} />
                      </div>
                    )}
                  </li>
                ))}
                {activeLessons.length === 0 && (
                  <li className="p-6 text-center text-muted-foreground">لا توجد دروس في هذا الكورس</li>
                )}
              </ul>
            )}
          </section>
        </div>
      )}
    </MarketerShell>
  );
}
