import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CoursesTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/courses")({
  head: () => ({
    meta: [
      { title: "الكورسات | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة الكورسات داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "الكورسات | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة الكورسات داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="الكورسات">
      <CoursesTab />
    </AdminShell>
  );
}
