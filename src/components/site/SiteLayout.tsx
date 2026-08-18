import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";

const nav = [
  { to: "/", label: "الرئيسية" },
  { to: "/courses", label: "الكورسات" },
  { to: "/teachers", label: "المعلمون" },
  { to: "/library", label: "مكتبة الملك" },
  { to: "/marketers", label: "المسوقون" },
  { to: "/about", label: "من نحن" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { session } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl surface-gradient text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-bold">منصة المُلك</span>
          </Link>

          <nav className="mr-auto hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-primary-soft text-primary font-semibold" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mr-auto flex items-center gap-2 lg:mr-0">
            {session ? (
              <Button asChild size="sm">
                <Link to="/dashboard">حسابي</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/auth" search={{ mode: "login" }}>
                    تسجيل الدخول
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    إنشاء حساب
                  </Link>
                </Button>
              </>
            )}
            <button
              className="rounded-md p-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="القائمة"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-border bg-card px-4 py-2 lg:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-primary-soft text-primary font-semibold" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg surface-gradient text-primary-foreground">
                <GraduationCap className="size-4" />
              </span>
              <span className="font-display font-bold">منصة المُلك</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              منصة تعليمية متكاملة لطلاب المرحلتين الإعدادية والثانوية — عام وأزهري ولغات، علمي
              وأدبي.
            </p>
          </div>
          <FooterCol
            title="المنصة"
            links={[
              { to: "/courses", label: "الكورسات" },
              { to: "/teachers", label: "المعلمون" },
              { to: "/library", label: "مكتبة الملك" },
            ]}
          />
          <FooterCol
            title="عن المنصة"
            links={[
              { to: "/about", label: "من نحن" },
              { to: "/vision", label: "الرؤية والرسالة" },
              { to: "/faq", label: "الأسئلة الشائعة" },
            ]}
          />
          <FooterCol
            title="قانوني"
            links={[
              { to: "/privacy", label: "سياسة الخصوصية" },
              { to: "/terms", label: "الشروط والأحكام" },
              { to: "/contact", label: "تواصل معنا" },
            ]}
          />
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          جميع الحقوق محفوظة © منصة المُلك التعليمية
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
