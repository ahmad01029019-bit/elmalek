import type { ReactNode } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { AppShell } from "@/components/app/AppShell";
import { useSession } from "@/lib/auth";

/**
 * Shared pages (courses, teachers, library, info pages) render inside the
 * public site chrome for visitors, and inside the student sidebar shell for
 * signed-in students — so a signed-in student never leaves their account UI.
 */
export function Shell({ children, title }: { children: ReactNode; title: string }) {
  const { session, loading } = useSession();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (session) {
    return <AppShell title={title}>{children}</AppShell>;
  }

  return <SiteLayout>{children}</SiteLayout>;
}
