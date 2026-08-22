import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { formatEGP } from "@/lib/education";
import { BookOpen, Wallet, Trophy, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "حسابي | منصة المُلك" },
      { name: "description", content: "لوحة الطالب: كورساتك وتقدّمك ومحفظتك على منصة المُلك." },
      { property: "og:title", content: "حسابي | منصة المُلك" },
      { property: "og:description", content: "تابع كورساتك ونتائجك من مكان واحد." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = useSession();
  const { data: profile } = useProfile();
  const uid = session?.user.id;

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id,course_id,courses(id,title,subject,cover_url)")
        .eq("student_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["my-attempts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id,score,total_marks,status,quizzes(title)")
        .eq("student_id", uid!)
        .order("started_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const submitted = (attempts ?? []).filter((a) => a.status === "submitted");
  const avg =
    submitted.length > 0
      ? Math.round(
          (submitted.reduce((s, a) => s + (a.total_marks ? a.score / a.total_marks : 0), 0) /
            submitted.length) *
            100,
        )
      : 0;

  return (
    <AppShell title={`أهلًا ${profile?.full_name || "بك"} 👋`}>
      {isAdmin && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="size-5" />
            <p className="text-sm font-bold">لديك صلاحية مدير على المنصة</p>
          </div>
          <Button asChild size="sm">
            <Link to="/admin">الدخول إلى لوحة الإدارة</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">

        <StatCard
          icon={BookOpen}
          label="كورساتي"
          value={String((enrollments ?? []).length)}
        />
        <StatCard icon={Wallet} label="رصيد المحفظة" value={formatEGP(profile?.wallet_balance ?? 0)} />
        <StatCard icon={Trophy} label="متوسط النتائج" value={`${avg}%`} />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">تابع الدراسة</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/courses">تصفح الكورسات</Link>
          </Button>
        </div>

        {(enrollments ?? []).length === 0 ? (
          <div className="mt-4 rounded-2xl card-soft p-8 text-center text-sm text-muted-foreground">
            لم تشترك في أي كورس بعد. ابدأ بأحد الكورسات المجانية.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(enrollments ?? []).map((e) => (
              <Link
                key={e.id}
                to="/learn/$courseId"
                params={{ courseId: e.course_id }}
                className="group flex gap-3 rounded-2xl card-soft p-4 transition-shadow hover:shadow-lg"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <PlayCircle className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold group-hover:text-primary">
                    {e.courses?.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.courses?.subject}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">آخر الاختبارات</h2>
        {(attempts ?? []).length === 0 ? (
          <div className="mt-4 rounded-2xl card-soft p-8 text-center text-sm text-muted-foreground">
            لا توجد محاولات اختبار بعد.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {(attempts ?? []).map((a) => {
              const pct = a.total_marks ? Math.round((a.score / a.total_marks) * 100) : 0;
              return (
                <li key={a.id} className="rounded-2xl card-soft p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{a.quizzes?.title}</span>
                    <span className="text-muted-foreground">
                      {a.status === "submitted" ? `${a.score} / ${a.total_marks}` : "قيد الاستكمال"}
                    </span>
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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
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
