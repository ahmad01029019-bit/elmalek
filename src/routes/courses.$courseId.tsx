import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTube } from "@/components/YouTube";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatEGP } from "@/lib/education";
import { PlayCircle, Lock, FileText, Clock } from "lucide-react";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "تفاصيل الكورس | منصة المُلك" },
      { name: "description", content: "محتوى الكورس والدروس والاختبارات على منصة المُلك التعليمية." },
      { property: "og:title", content: "تفاصيل الكورس | منصة المُلك" },
      { property: "og:description", content: "شاهد محتوى الكورس قبل الاشتراك." },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, teachers(name,slug,avatar_url)")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["course-lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_curriculum")
        .select("lesson_id,title,duration_minutes,is_preview,preview_youtube_id,position")
        .eq("course_id", courseId)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((l) => ({
        id: l.lesson_id,
        title: l.title,
        duration_minutes: l.duration_minutes,
        is_preview: l.is_preview,
        youtube_id: l.preview_youtube_id,
        position: l.position,
      }));
    },
  });


  const { data: enrolled } = useQuery({
    queryKey: ["enrolled", courseId, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", session!.user.id)
        .maybeSingle();
      return !!data;
    },
  });

  async function addToCart() {
    if (!session) {
      navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    const { error } = await supabase
      .from("cart_items")
      .insert({ course_id: courseId, student_id: session.user.id });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "الكورس موجود بالسلة" : "تعذر الإضافة");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["cart"] });
    toast.success("تمت إضافة الكورس إلى السلة");
  }

  async function enrollFree() {
    if (!session) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    const { error } = await supabase
      .from("enrollments")
      .insert({ course_id: courseId, student_id: session.user.id, price_paid: 0 });
    if (error) {
      toast.error("تعذر الاشتراك");
      return;
    }
    toast.success("تم الاشتراك في الكورس");
    navigate({ to: "/learn/$courseId", params: { courseId } });
  }

  if (isLoading) {
    return (
      <SiteLayout>
        <p className="py-24 text-center text-muted-foreground">جارٍ التحميل...</p>
      </SiteLayout>
    );
  }

  if (!course) {
    return (
      <SiteLayout>
        <div className="py-24 text-center">
          <p className="text-muted-foreground">الكورس غير موجود.</p>
          <Button asChild className="mt-4">
            <Link to="/courses">كل الكورسات</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const previewLesson = lessons?.find((l) => l.is_preview && l.youtube_id);

  return (
    <SiteLayout>
      <section className="surface-gradient text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{course.subject}</Badge>
              <Badge variant="secondary">{course.stage}</Badge>
              {course.track && <Badge variant="secondary">{course.track}</Badge>}
              <Badge variant="secondary">{course.edu_type}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{course.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-8 opacity-90">{course.description}</p>
            {course.teachers && (
              <Link
                to="/teachers/$slug"
                params={{ slug: course.teachers.slug }}
                className="mt-4 inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
              >
                المعلم: {course.teachers.name}
              </Link>
            )}
          </div>

          <aside className="rounded-2xl bg-card p-5 text-foreground shadow-lg">
            {previewLesson?.youtube_id ? (
              <YouTube id={previewLesson.youtube_id} title={previewLesson.title} />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-primary-soft text-primary">
                <PlayCircle className="size-10" />
              </div>
            )}
            <p className="mt-4 text-2xl font-bold">
              {course.is_free ? "مجاني" : formatEGP(course.price)}
            </p>
            <div className="mt-4 space-y-2">
              {enrolled ? (
                <Button asChild className="w-full">
                  <Link to="/learn/$courseId" params={{ courseId }}>
                    متابعة الدراسة
                  </Link>
                </Button>
              ) : course.is_free ? (
                <Button className="w-full" onClick={enrollFree}>
                  اشترك مجانًا
                </Button>
              ) : (
                <Button className="w-full" onClick={addToCart}>
                  أضف إلى السلة
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                {lessons?.length ?? 0} درسًا · وصول مدى الحياة
              </p>
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-bold">محتوى الكورس</h2>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl card-soft">
          {(lessons ?? []).map((l) => (
            <li key={l.id} className="flex items-center gap-3 p-4">
              {l.is_preview || enrolled || course.is_free ? (
                <PlayCircle className="size-5 shrink-0 text-primary" />
              ) : (
                <Lock className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 text-sm">{l.title}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {l.duration_minutes} د
              </span>
            </li>
          ))}
          {(lessons ?? []).length === 0 && (
            <li className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <FileText className="size-4" /> لم تتم إضافة دروس بعد.
            </li>
          )}
        </ul>
      </div>
    </SiteLayout>
  );
}
