import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DenmarkChampionshipShell({ children, className, context, active = true }: {
  children: ReactNode;
  className?: string;
  context: "tools" | "live" | "history";
  active?: boolean;
}) {
  return <div data-event-theme={active ? "denmark" : "default"} data-denmark-context={active ? context : undefined} className={cn(active && "denmark-championship", className)}>{children}</div>;
}

export function DenmarkHero({ eyebrow, title, edition, description, children, compact = false }: {
  eyebrow: string;
  title: string;
  edition?: string | number | null;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return <section className={cn("denmark-hero", compact && "denmark-hero-compact")}>
    <div className="denmark-hero-content">
      <p className="denmark-eyebrow"><span className="denmark-shield" aria-hidden="true" />{eyebrow}</p>
      <h1 className="denmark-hero-title">{title}</h1>
      {edition && <p className="denmark-edition">{edition}</p>}
      {description && <p className="denmark-hero-description">{description}</p>}
      {children}
    </div>
  </section>;
}

export function DenmarkSectionHeading({ eyebrow, title, id, className }: {
  eyebrow?: string;
  title: string;
  id?: string;
  className?: string;
}) {
  return <div className={cn("denmark-section-heading", className)}>
    <span className="denmark-section-mark" aria-hidden="true" />
    <div>{eyebrow && <p className="denmark-section-eyebrow">{eyebrow}</p>}<h2 id={id} className="display-title">{title}</h2></div>
  </div>;
}

export function DenmarkDivider() {
  return <div className="denmark-divider" aria-hidden="true"><span className="denmark-shield" /></div>;
}
