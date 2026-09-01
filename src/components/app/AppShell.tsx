import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Wallet,
  BarChart3,
  ScrollText,
  Library,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles } from "@/lib/auth";
import { formatEGP } from "@/lib/education";

const links = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/subjects", label: "المواد الدراسية", icon: BookOpen },
  { to: "/cart", label: "سلة الكورسات", icon: ShoppingCart },
  { to: "/wallet", label: "المحفظة", icon: Wallet },
  { to: "/stats", label: "الإحصائيات", icon: BarChart3 },
  { to: "/records", label: "السجل الدراسي", icon: ScrollText },
  { to: "/library", label: "مكتبة المُلك", icon: Library },
  { to: "/profile", label: "ملفي الشخصي", icon: User },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: roles } = useRoles();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAdmin = (roles ?? []).includes("admin");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link to="/" className="mb-3 flex items-center gap-2 px-2 py-2">
        <span className="flex size-9 items-center justify-center rounded-xl surface-gradient text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        <span className="font-display font-bold">منصة المُلك</span>
      </Link>

      <div className="mb-3 rounded-xl bg-primary-soft p-3">
        <p className="truncate text-sm font-bold text-primary">
          {profile?.full_name || "طالب جديد"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          الرصيد: {formatEGP(profile?.wallet_balance ?? 0)}
        </p>
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


      {isAdmin && (
        <Link
          to="/admin"
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/admin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Shield className="size-4" /> لوحة الإدارة
        </Link>
      )}

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
