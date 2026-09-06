import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  PlayCircle,
  FileQuestion,
  Library,
  Users,
  Megaphone,
  Tag,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/site/Logo";

const links = [
  { to: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { to: "/admin/teachers", label: "المعلمون", icon: GraduationCap },
  { to: "/admin/courses", label: "الكورسات", icon: BookOpen },
  { to: "/admin/lessons", label: "الدروس", icon: PlayCircle },
  { to: "/admin/quizzes", label: "الاختبارات", icon: FileQuestion },
  { to: "/admin/library", label: "المكتبة", icon: Library },
  { to: "/admin/students", label: "الطلاب", icon: Users },
  { to: "/admin/marketers", label: "المسوّقون", icon: Megaphone },
  { to: "/admin/offers", label: "عروض المسوّقين", icon: Tag },
] as const;

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin-portal", replace: true });
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-3 flex items-center gap-2 px-2 py-2">
        <LogoMark />
        <div>
          <p className="font-brand text-base font-semibold leading-tight tracking-tight">ElMalek</p>
          <p className="text-[11px] text-muted-foreground">لوحة الإدارة</p>
        </div>
      </div>

      {links.map((l) => {
        const active = pathname === l.to;
        return (
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <l.icon className="size-4" />
            {l.label}
          </Link>
        );
      })}

      <Button variant="ghost" className="mt-auto justify-start" onClick={signOut}>
        <LogOut className="size-4" /> تسجيل الخروج
      </Button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-border bg-card lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 bg-card shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="القائمة">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <h1 className="text-lg font-bold">{title}</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
