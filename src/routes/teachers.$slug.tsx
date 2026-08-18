import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CourseCard, type CourseCardData } from "@/components/site/CourseCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/teachers/$slug")({
  head: () => ({
    meta: [
      { title: "صفحة المعلم | منصة المُلك" },
      { name: "description", content: "كورسات المعلم وملفاته واختباراته على منصة المُلك التعليمية." },
      { property: "og:title", content: "صفحة المعلم | منصة المُلك" },
      { property: "og:description", content: "تصفح كل كورسات المعلم في مكان واحد." },
    ],
  }),
  component: TeacherPage,
});

function TeacherPage() {
  const { slug } = Route.useParams();

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,subject,stage,track,edu_type,price,is_free,cover_url,teachers(name,slug)")
        .eq("teacher_id", teacher!.id)
        .eq("is_published", true);
      if (error) throw error;
      return (data ?? []) as unknown as CourseCardData[];
    },
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <p className="py-24 text-center text-muted-foreground">جارٍ التحميل...</p>
      </SiteLayout>
    );
  }

  if (!teacher) {
    return (
      <SiteLayout>
        <div className="py-24 text-center">
          <p className="text-muted-foreground">هذا المعلم غير موجود.</p>
          <Button asChild className="mt-4">
            <Link to="/teachers">كل المعلمين</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="surface-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-12 text-center sm:flex-row sm:text-right">
          {teacher.avatar_url ? (
            <img
              src={teacher.avatar_url}
              alt={`صورة المعلم ${teacher.name}`}
              className="size-24 rounded-full object-cover ring-4 ring-white/30"
            />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-full bg-white/15">
              <GraduationCap className="size-10" />
            </span>
          )}
          <div>
            <h1 className="text-3xl font-bold">{teacher.name}</h1>
            <p className="mt-1 opacity-90">{teacher.subject}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {(teacher.stages ?? []).map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {teacher.bio && <p className="mb-8 leading-8 text-muted-foreground">{teacher.bio}</p>}
        <h2 className="text-xl font-bold">كورسات المعلم</h2>
        {(courses ?? []).length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">لا توجد كورسات منشورة حاليًا.</p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(courses ?? []).map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
