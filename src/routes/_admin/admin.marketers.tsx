import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { MarketersTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/marketers")({
  head: () => ({
    meta: [
      { title: "المسوّقون | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة المسوّقون داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "المسوّقون | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة المسوّقون داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="المسوّقون">
      <MarketersTab />
    </AdminShell>
  );
}
