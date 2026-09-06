import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { OffersTab } from "@/components/admin/tabs";

export const Route = createFileRoute("/_admin/admin/offers")({
  head: () => ({
    meta: [
      { title: "عروض المسوّقين | لوحة إدارة منصة المُلك" },
      { name: "description", content: "إدارة عروض المسوّقين داخل لوحة تحكم منصة المُلك التعليمية." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "عروض المسوّقين | لوحة إدارة منصة المُلك" },
      { property: "og:description", content: "إدارة عروض المسوّقين داخل لوحة تحكم منصة المُلك." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminShell title="عروض المسوّقين">
      <OffersTab />
    </AdminShell>
  );
}
