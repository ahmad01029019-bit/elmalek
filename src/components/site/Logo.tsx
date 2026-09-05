import logoAsset from "@/assets/elmalek-logo.jpg.asset.json";

/**
 * شعار منصة المُلك (ElMalek).
 * يُعرض داخل بطاقة بيضاء مدوّرة لتبقى الهوية واضحة في الوضعين الفاتح والغامق،
 * مع حلقة خفيفة تفصلها عن الخلفيات الداكنة.
 */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims =
    size === "sm"
      ? "size-8 rounded-lg p-0.5"
      : size === "lg"
        ? "size-12 rounded-2xl p-1"
        : "size-9 rounded-xl p-1";
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-border/60 ${dims}`}
    >
      <img
        src={logoAsset.url}
        alt="شعار منصة المُلك"
        className="size-full object-contain"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
