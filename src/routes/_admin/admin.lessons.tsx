import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { LessonsTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/lessons")({
  head: () => ({
    meta: [
      { title: "الدروس | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة الدروس داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "الدروس | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة الدروس داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="الدروس">
      <LessonsTab />
    </AdminShell>
  );
}
