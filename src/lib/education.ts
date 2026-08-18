export const STAGES = [
  "الأول الإعدادي",
  "الثاني الإعدادي",
  "الثالث الإعدادي",
  "الأول الثانوي",
  "الثاني الثانوي",
  "الثالث الثانوي",
] as const;

export const TRACKS = ["عام", "علمي علوم", "علمي رياضة", "أدبي"] as const;

export const EDU_TYPES = ["عام", "أزهري", "لغات"] as const;

export function formatEGP(value: number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}
