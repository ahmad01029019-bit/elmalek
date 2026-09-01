import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Library, Sparkles, Users, Wallet } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CourseCard, type CourseCardData } from "@/components/site/CourseCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EDU_TYPES, STAGES } from "@/lib/education";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منصة المُلك التعليمية | كورسات الإعدادي والثانوي" },
      {
        name: "description",
        content:
          "كورسات منظمة لطلاب الإعدادي والثانوي — عام وأزهري ولغات، علمي وأدبي، مع اختبارات إلكترونية وتصحيح تلقائي ومكتبة كتب بفيديوهات حل.",
      },
      { property: "og:title", content: "منصة المُلك التعليمية" },
      {
        property: "og:description",
        content: "تعلّم بنظام: كورسات، اختبارات بتصحيح تلقائي، ومكتبة إلكترونية بفيديوهات حل.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: BookOpen, title: "كورسات منظمة", text: "محتوى مرتب في دروس متسلسلة لكل مادة ومرحلة." },
  { icon: Sparkles, title: "تصحيح تلقائي وذكي", text: "اختبارات فورية التصحيح مع ملاحظات لكل سؤال." },
  { icon: Library, title: "مكتبة المُلك", text: "كتب إلكترونية على هيئة تدريبات بفيديو حل لكل فصل." },
  { icon: Users, title: "نخبة المعلمين", text: "صفحة خاصة لكل معلم بكورساته ومحتواه." },
  { icon: Wallet, title: "محفظة وأكواد خصم", text: "اشترِ بسهولة واستفد من أكواد خصم المسوقين." },
  { icon: GraduationCap, title: "متابعة وإحصائيات", text: "سجل دراسي كامل ونسب إنجاز لكل كورس." },
];

function Index() {
  const { data: freeCourses } = useQuery({
    queryKey: ["home-free-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,subject,stage,track,edu_type,price,is_free,cover_url,teachers(name,slug)")
        .eq("is_published", true)
        .eq("is_free", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as CourseCardData[];
    },
  });

  return (
    <SiteLayout>
      <section className="surface-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            منصة المُلك التعليمية — تعلّم بنظام من الإعدادي إلى الثانوي
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 opacity-90 sm:text-base">
            كل الشعب والأنظمة: عام وأزهري ولغات، علمي وأدبي. كورسات كاملة بفيديوهات وملفات
            واختبارات إلكترونية بتصحيح تلقائي ومتابعة لحظية لتقدّمك.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "signup" }}>
                ابدأ الآن مجانًا
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/courses">تصفح الكورسات</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-2 text-xs">
            {[...STAGES, ...EDU_TYPES].map((s) => (
              <span key={s} className="rounded-full bg-primary-foreground/15 px-3 py-1">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">لماذا منصة المُلك؟</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl card-soft p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">كورسات مجانية</h2>
            <Button asChild variant="ghost">
              <Link to="/courses">كل الكورسات</Link>
            </Button>
          </div>
          {(freeCourses ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              سيتم إضافة الكورسات المجانية قريبًا.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(freeCourses ?? []).map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-3xl surface-gradient px-6 py-12 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold">جاهز تبدأ رحلتك الدراسية؟</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 opacity-90">
            أنشئ حسابك الآن وتابع كورساتك ومحفظتك وسجلك الدراسي من مكان واحد.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/auth" search={{ mode: "signup" }}>
              إنشاء حساب
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
