import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { QuizzesTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/quizzes")({
  head: () => ({
    meta: [
      { title: "الاختبارات | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة الاختبارات داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "الاختبارات | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة الاختبارات داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="الاختبارات">
      <QuizzesTab />
    </AdminShell>
  );
}
