import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة | منصة المُلك" },
      {
        name: "description",
        content: "إجابات عن أكثر أسئلة الطلاب وأولياء الأمور شيوعًا حول منصة المُلك التعليمية.",
      },
      { property: "og:title", content: "الأسئلة الشائعة | منصة المُلك" },
      { property: "og:description", content: "كل ما تريد معرفته عن الاشتراك والكورسات والاختبارات." },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "هل توجد كورسات مجانية؟",
    a: "نعم، تجد في الصفحة الرئيسية وقسم الكورسات مجموعة من الكورسات المجانية المتاحة للجميع دون اشتراك.",
  },
  {
    q: "كيف أشترك في كورس مدفوع؟",
    a: "أضف الكورس إلى سلة الكورسات، ثم أتمم الشراء من المحفظة. يمكنك تطبيق كود خصم من أحد المسوقين قبل الدفع.",
  },
  {
    q: "كيف تعمل الاختبارات الإلكترونية؟",
    a: "كل اختبار له مؤقت زمني وحفظ تلقائي لإجاباتك، ويمكنك استكماله لاحقًا. بعد التسليم يظهر لك التصحيح وملاحظة لكل سؤال.",
  },
  {
    q: "وماذا عن الأسئلة المقالية؟",
    a: "يتم تقييم الإجابات المقالية آليًا بالذكاء الاصطناعي مع درجة مقترحة وملاحظة، ويمكن للإدارة تعديل الدرجة عند الحاجة.",
  },
  {
    q: "ما هي مكتبة المُلك؟",
    a: "قسم يضم كتبًا إلكترونية على شكل تدريبات وامتحانات، مع فيديو حل لكل فصل.",
  },
  {
    q: "كيف أصبح مسوّقًا؟",
    a: "أنشئ حساب مسوّق من صفحة المسوقين، وبعد اعتماد الحساب تحصل على كود خصم خاص بك وتربح عمولة بعد تجاوز 100 طالب.",
  },
];

function FaqPage() {
  return (
    <SiteLayout>
      <PageHero title="الأسئلة الشائعة" subtitle="أسرع طريقة للحصول على إجابة." />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-right">{f.q}</AccordionTrigger>
              <AccordionContent className="leading-8 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SiteLayout>
  );
}
