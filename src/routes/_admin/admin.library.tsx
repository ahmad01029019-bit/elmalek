import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { LibraryTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/library")({
  head: () => ({
    meta: [
      { title: "المكتبة | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة المكتبة داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "المكتبة | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة المكتبة داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="المكتبة">
      <LibraryTab />
    </AdminShell>
  );
}
