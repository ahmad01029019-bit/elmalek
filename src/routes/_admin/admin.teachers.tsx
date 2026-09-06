import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { TeachersTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/teachers")({
  head: () => ({
    meta: [
      { title: "المعلمون | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة المعلمون داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "المعلمون | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة المعلمون داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="المعلمون">
      <TeachersTab />
    </AdminShell>
  );
}
