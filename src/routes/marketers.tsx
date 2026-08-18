import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { BadgePercent, Users, Wallet, LineChart } from "lucide-react";

export const Route = createFileRoute("/marketers")({
  head: () => ({
    meta: [
      { title: "برنامج المسوقين | اربح مع منصة المُلك" },
      {
        name: "description",
        content:
          "انضم لبرنامج المسوقين في منصة المُلك: كود خصم خاص بك وعمولة على كل عملية شراء بعد 100 طالب.",
      },
      { property: "og:title", content: "برنامج المسوقين | منصة المُلك" },
      { property: "og:description", content: "اربح عمولة من كل اشتراك بكود الخصم الخاص بك." },
    ],
  }),
  component: MarketersPage,
});

const steps = [
  { icon: Users, title: "أنشئ حساب مسوّق", text: "سجّل بحساب مسوّق وانتظر اعتماد الإدارة." },
  { icon: BadgePercent, title: "احصل على كودك", text: "كود خصم خاص بك بنسبة يحددها لك النظام." },
  { icon: LineChart, title: "سوّق واتابع", text: "تابع عدد المشتركين وأرباحك لحظة بلحظة." },
  { icon: Wallet, title: "اسحب أرباحك", text: "بعد تجاوز 100 طالب يمكنك طلب السحب من المحفظة." },
];

function MarketersPage() {
  const { session } = useSession();

  return (
    <SiteLayout>
      <PageHero
        title="برنامج المسوقين"
        subtitle="حوّل متابعيك إلى دخل شهري: كود خصم خاص بك للطلاب، وعمولة لك على كل عملية شراء."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {session ? (
            <Button asChild size="lg" variant="secondary">
              <Link to="/marketer">لوحة المسوّق</Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "marketer" }}>
                سجّل كمسوّق الآن
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="bg-transparent text-inherit">
            <Link to="/terms">شروط الربح</Link>
          </Button>
        </div>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.title} className="rounded-2xl card-soft p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="size-5" />
              </span>
              <h2 className="mt-3 font-bold">{s.title}</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl card-soft p-6">
          <h2 className="text-lg font-bold">شروط الربح والسحب</h2>
          <ul className="mt-3 space-y-2 text-sm leading-8 text-muted-foreground">
            <li>• تبدأ العمولة في الاحتساب بعد تجاوز 100 عملية شراء ناجحة بكودك.</li>
            <li>• نسبة الخصم للطالب ونسبة عمولتك تحددهما الإدارة لكل كود.</li>
            <li>• تُضاف الأرباح إلى محفظة المسوّق فور اكتمال عملية الشراء.</li>
            <li>• الحد الأدنى للسحب 500 ج.م عبر بوابة الدفع أو المحفظة الإلكترونية.</li>
            <li>• يُمنع استخدام حسابات وهمية أو التسويق المضلل، وإلا يُلغى الحساب.</li>
          </ul>
        </div>
      </div>
    </SiteLayout>
  );
}
