import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export function AccessibleTooltip({
  label,
  description,
  className,
  showLabelInTooltip = true,
}: {
  label: string;
  description: string;
  className?: string;
  showLabelInTooltip?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const explanation = `${label}: ${description}`;
  const tooltipText = showLabelInTooltip ? explanation : description;
  return (
    <span className="group/tooltip relative inline-flex">
      <button
        type="button"
        aria-label={explanation}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className={cn(
          "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
          className,
        )}
      >
        {label}
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[90] w-auto max-w-none translate-x-0 rounded-xl border border-white/10 bg-[#171917] px-3 py-2 text-left text-xs font-medium normal-case leading-relaxed tracking-normal text-white shadow-2xl transition sm:absolute sm:inset-x-auto sm:bottom-[calc(100%+0.5rem)] sm:left-1/2 sm:w-max sm:max-w-64 sm:-translate-x-1/2",
          open
            ? "visible opacity-100"
            : "invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100",
        )}
      >
        {tooltipText}
      </span>
    </span>
  );
}
