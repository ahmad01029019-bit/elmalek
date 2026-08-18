import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي | منصة المُلك" },
      { name: "description", content: "تعديل بياناتك الشخصية ورقم الهاتف على منصة المُلك." },
      { property: "og:title", content: "الملف الشخصي | منصة المُلك" },
      { property: "og:description", content: "إدارة بيانات حسابك." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session } = useSession();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  async function save() {
    if (fullName.trim().length < 3) {
      toast.error("الاسم قصير جدًا");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", session!.user.id);
    setBusy(false);
    if (error) {
      toast.error("تعذر الحفظ");
      return;
    }
    await qc.invalidateQueries();
    toast.success("تم حفظ البيانات");
  }

  return (
    <AppShell title="الملف الشخصي">
      <div className="max-w-lg space-y-4 rounded-2xl card-soft p-6">
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input id="email" dir="ltr" value={session?.user.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">الاسم بالكامل</Label>
          <Input
            id="name"
            value={fullName}
            maxLength={100}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            dir="ltr"
            value={phone}
            maxLength={20}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={busy}>
          حفظ التغييرات
        </Button>
      </div>
    </AppShell>
  );
}
