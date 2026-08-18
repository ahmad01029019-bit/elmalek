import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { BarChart3, CheckCircle2, ListChecks, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "الإحصائيات | منصة المُلك" },
      { name: "description", content: "إحصائيات تقدّمك: الدروس المكتملة ومتوسط درجات الاختبارات." },
      { property: "og:title", content: "الإحصائيات | منصة المُلك" },
      { property: "og:description", content: "قياس تقدمك الدراسي بالأرقام." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { session } = useSession();
  const uid = session?.user.id;

  const { data } = useQuery({
    queryKey: ["stats", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [progress, attempts, enrollments] = await Promise.all([
        supabase.from("lesson_progress").select("id,course_id").eq("student_id", uid!),
        supabase
          .from("quiz_attempts")
          .select("id,score,total_marks,status,quizzes(title)")
          .eq("student_id", uid!),
        supabase.from("enrollments").select("id,course_id,courses(title)").eq("student_id", uid!),
      ]);
      return {
        progress: progress.data ?? [],
        attempts: attempts.data ?? [],
        enrollments: enrollments.data ?? [],
      };
    },
  });

  const submitted = (data?.attempts ?? []).filter((a) => a.status === "submitted");
  const avg =
    submitted.length > 0
      ? Math.round(
          (submitted.reduce((s, a) => s + (a.total_marks ? a.score / a.total_marks : 0), 0) /
            submitted.length) *
            100,
        )
      : 0;

  return (
    <AppShell title="الإحصائيات">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ListChecks} label="كورساتي" value={String((data?.enrollments ?? []).length)} />
        <Stat icon={CheckCircle2} label="دروس مكتملة" value={String((data?.progress ?? []).length)} />
        <Stat icon={Timer} label="اختبارات مسلّمة" value={String(submitted.length)} />
        <Stat icon={BarChart3} label="متوسط النتائج" value={`${avg}%`} />
      </div>

      <section className="mt-8 rounded-2xl card-soft p-5">
        <h2 className="font-bold">أداؤك في الاختبارات</h2>
        {submitted.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            لم تُسلّم أي اختبار بعد.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {submitted.map((a) => {
              const pct = a.total_marks ? Math.round((a.score / a.total_marks) * 100) : 0;
              return (
                <li key={a.id}>
                  <div className="flex justify-between text-sm">
                    <span>{a.quizzes?.title}</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <Progress value={pct} className="mt-2" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl card-soft p-5">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}
