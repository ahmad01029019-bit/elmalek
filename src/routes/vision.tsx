import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, Prose } from "@/components/site/PageHero";

export const Route = createFileRoute("/vision")({
  head: () => ({
    meta: [
      { title: "الرؤية والرسالة | منصة المُلك" },
      {
        name: "description",
        content: "رؤية منصة المُلك ورسالتها وقيمها في تقديم تعليم منظم وميسّر لكل طالب.",
      },
      { property: "og:title", content: "الرؤية والرسالة | منصة المُلك" },
      { property: "og:description", content: "رؤيتنا ورسالتنا وقيمنا التعليمية." },
    ],
  }),
  component: VisionPage,
});

function VisionPage() {
  return (
    <SiteLayout>
      <PageHero title="الرؤية والرسالة" subtitle="نؤمن أن التعليم الجيد حق لكل طالب مهما كانت إمكانياته." />
      <Prose>
        <h2>رؤيتنا</h2>
        <p>
          أن نكون المنصة التعليمية الأولى التي يثق بها طلاب المرحلتين الإعدادية والثانوية في مصر،
          بمحتوى منظم ومتابعة ذكية ترفع مستوى الطالب خطوة بخطوة.
        </p>
        <h2>رسالتنا</h2>
        <p>
          تقديم تجربة تعليمية متكاملة تجمع الشرح المرئي والملفات والاختبارات الإلكترونية في مكان
          واحد، مع تصحيح فوري وملاحظات دقيقة تساعد الطالب على معرفة نقاط ضعفه ومعالجتها.
        </p>
        <h2>قيمنا</h2>
        <ul>
          <li>الوضوح: محتوى منظم بلا تشتيت.</li>
          <li>العدالة: كورسات مجانية دائمًا لكل مرحلة.</li>
          <li>الجودة: مراجعة كل محتوى قبل نشره.</li>
          <li>الخصوصية: حماية بيانات الطلاب وأولياء الأمور.</li>
        </ul>
      </Prose>
    </SiteLayout>
  );
}
