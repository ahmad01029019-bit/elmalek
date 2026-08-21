import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/learn/$courseId")({
  head: () => ({
    meta: [
      { title: "مشغل الدروس | منصة المُلك" },
      { name: "description", content: "شاهد دروس الكورس وتابع تقدمك درسًا بدرس على منصة المُلك." },
      { property: "og:title", content: "مشغل الدروس | منصة المُلك" },
      { property: "og:description", content: "تعلّم بترتيب منظم مع متابعة التقدم." },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { courseId } = Route.useParams();
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ["learn-course", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,title,lessons(id,title,youtube_id,position)")
        .eq("id", courseId)
        .maybeSingle();
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["learn-progress", courseId, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("student_id", uid!)
        .eq("course_id", courseId);
      return (data ?? []).map((p) => p.lesson_id);
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["learn-quizzes", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id,title,duration_minutes,lesson_id,course_id,lessons(course_id)")
        .order("created_at", { ascending: true });
      return (data ?? []).filter(
        (q) => q.course_id === courseId || q.lessons?.course_id === courseId,
      );
    },
  });

  const lessons = [...(course?.lessons ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  const active = lessons.find((l) => l.id === activeId) ?? lessons[0];
  const done = new Set(progress ?? []);

  async function markDone() {
    if (!uid || !active) return;
    await supabase
      .from("lesson_progress")
      .upsert({ student_id: uid, course_id: courseId, lesson_id: active.id });
    await qc.invalidateQueries({ queryKey: ["learn-progress", courseId, uid] });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="truncate font-bold">{course?.title ?? "الكورس"}</h1>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          حسابي <ArrowRight className="size-4" />
        </Link>
      </header>

      <div className="grid gap-6 p-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted">
            {active?.youtube_id ? (
              <iframe
                src={`https://www.youtube.com/embed/${active.youtube_id}`}
                title={active.title}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                لا يوجد فيديو لهذا الدرس
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{active?.title}</h2>
            <Button onClick={markDone} disabled={!active || done.has(active.id)}>
              {active && done.has(active.id) ? "تم الإكمال" : "تحديد كمكتمل"}
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-2xl card-soft p-4">
          <h3 className="mb-3 font-bold">الدروس</h3>
          <ul className="space-y-1">
            {lessons.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => setActiveId(l.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm transition-colors hover:bg-accent ${
                    active?.id === l.id ? "bg-accent font-semibold" : ""
                  }`}
                >
                  {done.has(l.id) ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{l.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
