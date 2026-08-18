import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا | منصة المُلك" },
      {
        name: "description",
        content: "تواصل مع فريق دعم منصة المُلك لأي استفسار عن الكورسات أو الاشتراك أو الاختبارات.",
      },
      { property: "og:title", content: "تواصل معنا | منصة المُلك" },
      { property: "og:description", content: "فريق الدعم في خدمتك طوال أيام الأسبوع." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(100),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").max(255),
  message: z.string().trim().min(10, "الرسالة قصيرة جدًا").max(1000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    toast.success("تم استلام رسالتك، سنعاود التواصل معك قريبًا.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <SiteLayout>
      <PageHero title="تواصل معنا" subtitle="نسعد بخدمتك والرد على استفساراتك." />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl card-soft p-6">
          <div className="space-y-2">
            <Label htmlFor="c-name">الاسم</Label>
            <Input
              id="c-name"
              value={form.name}
              maxLength={100}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">البريد الإلكتروني</Label>
            <Input
              id="c-email"
              dir="ltr"
              value={form.email}
              maxLength={255}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-msg">رسالتك</Label>
            <Textarea
              id="c-msg"
              rows={6}
              maxLength={1000}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <Button type="submit">إرسال الرسالة</Button>
        </form>

        <aside className="space-y-4 rounded-2xl card-soft p-6 text-sm">
          <h2 className="text-base font-bold">بيانات التواصل</h2>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4 text-primary" /> support@almulk.edu
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-4 text-primary" /> 01000000000
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="size-4 text-primary" /> دعم فني يوميًا من 10ص إلى 10م
          </p>
        </aside>
      </div>
    </SiteLayout>
  );
}
