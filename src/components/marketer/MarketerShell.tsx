import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  BadgePercent,
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/marketer", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/marketer/links", label: "الروابط والكوبونات", icon: Ticket },
  { to: "/marketer/reports", label: "التقارير والإحصائيات", icon: BarChart3 },
  { to: "/marketer/earnings", label: "الأرباح والسحوبات", icon: Wallet },
  { to: "/marketer/settings", label: "الإعدادات والدعم", icon: LifeBuoy },
] as const;

export function MarketerShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/marketer-portal", replace: true });
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 flex items-center gap-2 px-2 py-2">
        <span className="flex size-9 items-center justify-center rounded-xl violet-gradient text-primary-foreground">
          <BadgePercent className="size-5" />
        </span>
        <span className="font-display font-bold">بوابة المسوّقين</span>
      </div>

      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: "exact" in item ? item.exact : false }}
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          activeProps={{ className: "violet-gradient text-primary-foreground shadow-sm" }}
        >
          <item.icon className="size-4" /> {item.label}
        </Link>
      ))}

      <Link
        to="/marketer/demo"
        onClick={() => setOpen(false)}
        className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-primary/40 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
        activeProps={{ className: "bg-primary-soft" }}
      >
        <GraduationCap className="size-4" /> حساب طالب تجريبي
      </Link>

      <Button variant="ghost" className="mt-auto justify-start" onClick={signOut}>
        <LogOut className="size-4" /> تسجيل الخروج
      </Button>
    </nav>
  );

  return (
    <div className="marketer-theme flex min-h-screen bg-secondary/40">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-border bg-card lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="marketer-theme absolute inset-y-0 right-0 w-72 bg-card shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="القائمة">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
