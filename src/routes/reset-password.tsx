import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور | منصة المُلك" },
      {
        name: "description",
        content: "اختر كلمة مرور جديدة لحسابك على منصة المُلك التعليمية.",
      },
      { property: "og:title", content: "إعادة تعيين كلمة المرور | منصة المُلك" },
      { property: "og:description", content: "استعادة الوصول إلى حسابك." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تحديث كلمة المرور بنجاح");
    navigate({ to: "/dashboard" });
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl card-soft p-6">
          <h1 className="text-2xl font-bold">إعادة تعيين كلمة المرور</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            افتح هذه الصفحة من رابط الاستعادة المرسل إلى بريدك، ثم اختر كلمة مرور جديدة.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="pw">كلمة المرور الجديدة</Label>
              <Input
                id="pw"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">تأكيد كلمة المرور</Label>
              <Input
                id="pw2"
                type="password"
                dir="ltr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
            </Button>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}
