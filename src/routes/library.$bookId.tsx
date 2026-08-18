import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTube } from "@/components/YouTube";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/library/$bookId")({
  head: () => ({
    meta: [
      { title: "كتاب إلكتروني | مكتبة المُلك" },
      { name: "description", content: "فصول الكتاب الإلكتروني مع فيديو حل لكل فصل وملف PDF." },
      { property: "og:title", content: "كتاب إلكتروني | مكتبة المُلك" },
      { property: "og:description", content: "تدريبات وامتحانات مع حلول مصوّرة." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { bookId } = Route.useParams();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_books")
        .select("*")
        .eq("id", bookId)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: chapters } = useQuery({
    queryKey: ["book-chapters", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_chapters")
        .select("id,title,pdf_url,solution_youtube_id,position")
        .eq("book_id", bookId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <p className="py-24 text-center text-muted-foreground">جارٍ التحميل...</p>
      </SiteLayout>
    );
  }

  if (!book) {
    return (
      <SiteLayout>
        <div className="py-24 text-center">
          <p className="text-muted-foreground">هذا الكتاب غير متاح.</p>
          <Button asChild className="mt-4">
            <Link to="/library">مكتبة المُلك</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const active = (chapters ?? []).find((c) => c.id === activeId);

  return (
    <SiteLayout>
      <section className="surface-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{book.subject}</Badge>
            <Badge variant="secondary">{book.stage}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold">{book.title}</h1>
          {book.description && <p className="mt-2 max-w-2xl opacity-90">{book.description}</p>}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl card-soft p-5">
          {active?.solution_youtube_id ? (
            <>
              <YouTube id={active.solution_youtube_id} title={`حل ${active.title}`} />
              <h2 className="mt-4 font-bold">فيديو حل: {active.title}</h2>
            </>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-primary-soft text-primary">
              <div className="text-center">
                <PlayCircle className="mx-auto size-10" />
                <p className="mt-2 text-sm">اختر فصلًا لعرض فيديو الحل</p>
              </div>
            </div>
          )}
          {active?.pdf_url && (
            <Button asChild variant="outline" className="mt-4">
              <a href={active.pdf_url} target="_blank" rel="noreferrer">
                <FileDown className="ml-1 size-4" /> تحميل ملف الفصل
              </a>
            </Button>
          )}
        </div>

        <aside className="rounded-2xl card-soft p-4">
          <h2 className="mb-3 font-bold">فصول الكتاب</h2>
          <ul className="space-y-1">
            {(chapters ?? []).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`w-full rounded-lg px-3 py-2 text-right text-sm transition-colors ${
                    activeId === c.id
                      ? "bg-primary-soft font-semibold text-primary"
                      : "hover:bg-secondary"
                  }`}
                >
                  {c.title}
                </button>
              </li>
            ))}
            {(chapters ?? []).length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">لا توجد فصول بعد.</li>
            )}
          </ul>
        </aside>
      </div>
    </SiteLayout>
  );
}
