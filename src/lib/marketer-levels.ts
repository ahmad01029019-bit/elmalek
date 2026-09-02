/** أدوات مشتركة لنظام مستويات المسوّقين والعام الدراسي. */

export type MarketerLevel = {
  level: number;
  name: string;
  min_students: number;
  max_students: number | null;
  commission_percent: number;
  shield: string | null;
};

/** يحسب اسم العام الدراسي الحالي مثل «2025/2026» حسب شهر بدايته. */
export function academicYearLabel(startMonth = 9, at: Date = new Date()) {
  const y = at.getFullYear();
  const m = at.getMonth() + 1;
  const start = m >= startMonth ? y : y - 1;
  return `${start}/${start + 1}`;
}

/** يحدد المستوى المناسب لعدد الطلاب داخل الموسم. */
export function levelForCount(levels: MarketerLevel[], count: number): MarketerLevel | null {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  let match: MarketerLevel | null = null;
  for (const l of sorted) {
    if (count >= l.min_students && (l.max_students === null || count <= l.max_students)) match = l;
  }
  return match ?? sorted[0] ?? null;
}

/** نسبة التقدم نحو المستوى التالي. */
export function levelProgress(levels: MarketerLevel[], count: number) {
  const current = levelForCount(levels, count);
  if (!current) return { current: null, next: null, percent: 0, remaining: 0 };
  const next = [...levels].sort((a, b) => a.level - b.level).find((l) => l.level === current.level + 1) ?? null;
  if (!next) return { current, next: null, percent: 100, remaining: 0 };
  const span = Math.max(1, next.min_students - current.min_students);
  const done = Math.min(span, Math.max(0, count - current.min_students));
  return {
    current,
    next,
    percent: Math.round((done / span) * 100),
    remaining: Math.max(0, next.min_students - count),
  };
}
