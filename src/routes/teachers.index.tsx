import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/site/Shell";
import { PageHero } from "@/components/site/PageHero";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/teachers/")({
  head: () => ({
    meta: [
      { title: "المعلمون | منصة المُلك التعليمية" },
      {
        name: "description",
        content: "تعرّف على نخبة معلمي منصة المُلك في جميع المواد للمرحلتين الإعدادية والثانوية.",
      },
      { property: "og:title", content: "المعلمون | منصة المُلك" },
      { property: "og:description", content: "صفحة خاصة لكل معلم بكورساته ومحتواه." },
    ],
  }),
  component: TeachersPage,
});

function TeachersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id,name,slug,subject,bio,avatar_url,stages")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Shell title="المعلمون">
      <PageHero title="المعلمون" subtitle="لكل معلم صفحته الخاصة بكورساته وملفاته واختباراته." />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">جارٍ التحميل...</p>
        ) : (data ?? []).length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">لم تتم إضافة معلمين بعد.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((t) => (
              <Link
                key={t.id}
                to="/teachers/$slug"
                params={{ slug: t.slug }}
                className="group rounded-2xl card-soft p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  {t.avatar_url ? (
                    <img
                      src={t.avatar_url}
                      alt={`صورة المعلم ${t.name}`}
                      loading="lazy"
                      className="size-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <GraduationCap className="size-6" />
                    </span>
                  )}
                  <div>
                    <h2 className="font-bold group-hover:text-primary">{t.name}</h2>
                    <p className="text-xs text-muted-foreground">{t.subject}</p>
                  </div>
                </div>
                {t.bio && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{t.bio}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(t.stages ?? []).map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
