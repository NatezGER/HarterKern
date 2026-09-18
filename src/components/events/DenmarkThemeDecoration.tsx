import { cn } from "@/lib/cn";

/** Decorative CSS flags and pennants. No network asset or layout-sized image. */
export function DenmarkThemeDecoration({ compact = false }: { compact?: boolean }) {
  return <div className={cn("denmark-decoration", compact && "denmark-decoration-compact")} aria-hidden="true">
    <span className="denmark-flag denmark-flag-primary" />
    <span className="denmark-flag denmark-flag-secondary" />
    <span className="denmark-pennants" />
  </div>;
}
