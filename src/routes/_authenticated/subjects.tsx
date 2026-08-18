import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "المواد الدراسية | منصة المُلك" },
      { name: "description", content: "كل موادك الدراسية وكورساتك المشترك بها في مكان واحد." },
      { property: "og:title", content: "المواد الدراسية | منصة المُلك" },
      { property: "og:description", content: "تنظيم كورساتك حسب المادة." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { session } = useSession();
  const uid = session?.user.id;

  const { data } = useQuery({
    queryKey: ["subjects", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id,courses(id,title,subject,stage)")
        .eq("student_id", uid!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = new Map<string, { id: string; title: string }[]>();
  for (const row of data ?? []) {
    const c = row.courses;
    if (!c) continue;
    const list = grouped.get(c.subject) ?? [];
    list.push({ id: c.id, title: c.title });
    grouped.set(c.subject, list);
  }

  return (
    <AppShell title="المواد الدراسية">
      {grouped.size === 0 ? (
        <div className="rounded-2xl card-soft p-10 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا توجد مواد بعد.</p>
          <Button asChild className="mt-4">
            <Link to="/courses">تصفح الكورسات</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...grouped.entries()].map(([subject, courses]) => (
            <div key={subject} className="rounded-2xl card-soft p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{subject}</h2>
                <Badge variant="outline">{courses.length} كورس</Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {courses.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/learn/$courseId"
                      params={{ courseId: c.id }}
                      className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary"
                    >
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
