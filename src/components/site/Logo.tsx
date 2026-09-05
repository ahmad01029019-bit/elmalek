import logoAsset from "@/assets/elmalek-m.png.asset.json";

/**
 * شعار منصة المُلك (ElMalek) — حرف M أزرق مفرّغ بدون خلفية أو إطار،
 * يملأ المساحة المخصصة له ويظهر بوضوح في الوضعين الفاتح والغامق.
 */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-9";
  return (
    <img
      src={logoAsset.url}
      alt="شعار منصة المُلك"
      className={`${dims} w-auto shrink-0 object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}
