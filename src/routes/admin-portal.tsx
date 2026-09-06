import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LogoMark } from "@/components/site/Logo";

export const Route = createFileRoute("/admin-portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "بوابة الإدارة | منصة المُلك" },
      { name: "description", content: "دخول مديري منصة المُلك إلى لوحة التحكم عبر حساب جوجل." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "بوابة الإدارة | منصة المُلك" },
      { property: "og:description", content: "دخول خاص بمديري المنصة." },
    ],
  }),
  component: AdminPortal,
});

function AdminPortal() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setChecking(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (!active) return;
      if ((roles ?? []).some((r) => r.role === "admin")) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      setDenied(true);
      setChecking(false);
    }
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void check();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function signInGoogle() {
    setBusy(true);
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin-portal",
      });
    } catch {
      toast.error("تعذّر تسجيل الدخول عبر جوجل، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setDenied(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-2xl card-soft p-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center gap-2">
          <LogoMark />
          <span className="font-brand text-lg font-semibold tracking-tight">ElMalek</span>
        </div>
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-xl font-bold">بوابة الإدارة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          هذه البوابة مخصّصة لمديري المنصة فقط، والدخول يتم عبر حساب جوجل.
        </p>

        {checking ? (
          <div className="mt-6 flex justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : denied ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              هذا الحساب لا يملك صلاحية إدارة.
            </p>
            <Button variant="outline" className="w-full" onClick={signOut}>
              تسجيل الخروج وتجربة حساب آخر
            </Button>
          </div>
        ) : (
          <Button className="mt-6 w-full" onClick={signInGoogle} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            الدخول بحساب جوجل
          </Button>
        )}
      </div>
    </div>
  );
}
