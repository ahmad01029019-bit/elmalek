import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/library/")({
  head: () => ({
    meta: [
      { title: "مكتبة المُلك | كتب إلكترونية بفيديوهات حل" },
      {
        name: "description",
        content:
          "مكتبة المُلك: كتب إلكترونية على شكل تدريبات وامتحانات مع فيديو حل لكل فصل لطلاب الإعدادي والثانوي.",
      },
      { property: "og:title", content: "مكتبة المُلك" },
      { property: "og:description", content: "كتب إلكترونية بتدريبات وفيديوهات حل." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["library-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_books")
        .select("id,title,subject,stage,description,cover_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <PageHero
        title="مكتبة المُلك"
        subtitle="كتب إلكترونية على هيئة تدريبات وامتحانات، ولكل فصل فيديو حل تفصيلي."
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">جارٍ التحميل...</p>
        ) : (data ?? []).length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">لم تتم إضافة كتب بعد.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((b) => (
              <Link
                key={b.id}
                to="/library/$bookId"
                params={{ bookId: b.id }}
                className="group overflow-hidden rounded-2xl card-soft transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[4/3] bg-primary-soft">
                  {b.cover_url ? (
                    <img
                      src={b.cover_url}
                      alt={`غلاف كتاب ${b.title}`}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-primary">
                      <BookOpen className="size-10" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <h2 className="font-bold group-hover:text-primary">{b.title}</h2>
                  {b.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{b.subject}</Badge>
                    <Badge variant="outline">{b.stage}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
