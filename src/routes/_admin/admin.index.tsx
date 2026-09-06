import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { Overview } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({
    meta: [
      { title: "نظرة عامة | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة نظرة عامة داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "نظرة عامة | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة نظرة عامة داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="نظرة عامة">
      <Overview />
    </AdminShell>
  );
}
