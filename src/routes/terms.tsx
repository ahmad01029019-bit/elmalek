import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, Prose } from "@/components/site/PageHero";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام | منصة المُلك" },
      {
        name: "description",
        content: "شروط استخدام منصة المُلك التعليمية وسياسة الاشتراك والاسترداد.",
      },
      { property: "og:title", content: "الشروط والأحكام | منصة المُلك" },
      { property: "og:description", content: "قواعد الاستخدام وحقوق المحتوى." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <PageHero title="الشروط والأحكام" subtitle="باستخدامك للمنصة فأنت توافق على البنود التالية." />
      <Prose>
        <h2>الحساب</h2>
        <ul>
          <li>الحساب شخصي ولا يجوز مشاركته مع طالب آخر.</li>
          <li>يحق للإدارة إيقاف أي حساب يثبت مشاركته أو إساءة استخدامه.</li>
        </ul>
        <h2>المحتوى</h2>
        <ul>
          <li>جميع الكورسات والملفات مخصصة للاستخدام الشخصي فقط.</li>
          <li>يُمنع إعادة نشر أو بيع أي محتوى من المنصة.</li>
        </ul>
        <h2>الدفع والاسترداد</h2>
        <ul>
          <li>تتم عمليات الشراء عبر رصيد المحفظة داخل المنصة.</li>
          <li>يمكن طلب استرداد خلال 48 ساعة من الشراء ما لم يتم تجاوز 20% من محتوى الكورس.</li>
        </ul>
        <h2>برنامج المسوقين</h2>
        <ul>
          <li>تُحتسب العمولة بعد تجاوز 100 عملية شراء ناجحة بكود المسوّق.</li>
          <li>يُمنع التسويق المضلل أو استخدام الكود بحسابات وهمية.</li>
        </ul>
      </Prose>
    </SiteLayout>
  );
}
