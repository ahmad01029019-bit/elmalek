import type { ReactNode } from "react";

export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="surface-gradient text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-90 sm:text-base">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-8 text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_li]:mr-5 [&_li]:list-disc">
      {children}
    </div>
  );
}
