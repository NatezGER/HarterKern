import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}

export function SectionHeading({ eyebrow, title, action }: SectionHeadingProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gold-400">{eyebrow}</p>}
        <h2 className="display-title text-2xl sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
