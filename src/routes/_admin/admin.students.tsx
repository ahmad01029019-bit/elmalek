import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { StudentsTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/students")({
  head: () => ({
    meta: [
      { title: "الطلاب | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة الطلاب داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "الطلاب | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة الطلاب داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="الطلاب">
      <StudentsTab />
    </AdminShell>
  );
}
