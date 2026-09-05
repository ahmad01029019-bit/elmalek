import logoAsset from "@/assets/elmalek-m.png.asset.json";

/**
 * شعار منصة المُلك (ElMalek) — حرف M أزرق مفرّغ بدون خلفية أو إطار،
 * بحجم متناسق مع النص المجاور وواضح في الوضعين الفاتح والغامق.
 */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-5" : size === "lg" ? "h-7" : "h-6";
  return (
    <img
      src={logoAsset.url}
      alt="ElMalek"
      className={`${dims} w-auto shrink-0 object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}
