import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | منصة المُلك" },
      { name: "description", content: "نظرة عامة على المعلمين والكورسات والطلاب في منصة المُلك." },
      { property: "og:title", content: "لوحة الإدارة | منصة المُلك" },
      { property: "og:description", content: "إدارة محتوى المنصة." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const isAdmin = useIsAdmin();

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const [teachers, courses, students] = await Promise.all([
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        teachers: teachers.count ?? 0,
        courses: courses.count ?? 0,
        students: students.count ?? 0,
      };
    },
  });

  if (!isAdmin) {
    return (
      <AppShell title="لوحة الإدارة">
        <p className="rounded-2xl card-soft p-8 text-center text-sm text-muted-foreground">
          هذه الصفحة متاحة لمديري المنصة فقط.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="لوحة الإدارة">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="المعلمون" value={String(data?.teachers ?? 0)} />
        <Card label="الكورسات" value={String(data?.courses ?? 0)} />
        <Card label="الحسابات" value={String(data?.students ?? 0)} />
      </div>
      <p className="mt-6 rounded-2xl card-soft p-5 text-sm text-muted-foreground">
        أدوات إنشاء المعلمين والكورسات والاختبارات ستُضاف في المرحلة القادمة.
      </p>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl card-soft p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
