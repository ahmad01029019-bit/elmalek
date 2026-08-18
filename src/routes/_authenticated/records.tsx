import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({
    meta: [
      { title: "السجل الدراسي | منصة المُلك" },
      { name: "description", content: "سجل اشتراكاتك ونتائج اختباراتك بالتواريخ على منصة المُلك." },
      { property: "og:title", content: "السجل الدراسي | منصة المُلك" },
      { property: "og:description", content: "أرشيف كامل لمسيرتك الدراسية." },
    ],
  }),
  component: RecordsPage,
});

function RecordsPage() {
  const { session } = useSession();
  const uid = session?.user.id;

  const { data: enrollments } = useQuery({
    queryKey: ["records-enrollments", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id,created_at,price_paid,courses(title,subject)")
        .eq("student_id", uid!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["records-attempts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id,score,total_marks,status,submitted_at,started_at,quizzes(title)")
        .eq("student_id", uid!)
        .order("started_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title="السجل الدراسي">
      <section className="rounded-2xl card-soft p-5">
        <h2 className="font-bold">الاشتراكات</h2>
        {(enrollments ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد اشتراكات.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {(enrollments ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{e.courses?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString("ar-EG")} · {e.courses?.subject}
                  </p>
                </div>
                <Badge variant="outline">{e.price_paid > 0 ? `${e.price_paid} ج.م` : "مجاني"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl card-soft p-5">
        <h2 className="font-bold">الاختبارات</h2>
        {(attempts ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد اختبارات.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {(attempts ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{a.quizzes?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.submitted_at ?? a.started_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <Badge variant={a.status === "submitted" ? "default" : "secondary"}>
                  {a.status === "submitted" ? `${a.score} / ${a.total_marks}` : "قيد الاستكمال"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
