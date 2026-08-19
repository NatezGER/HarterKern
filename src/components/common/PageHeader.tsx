interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-6 border-b border-white/[0.08] pb-8 md:flex-row md:items-end">
      <div>
        <p className="context-accent-text mb-3 text-xs font-bold uppercase tracking-[0.22em]">{eyebrow}</p>
        <h1 className="display-title text-5xl leading-none sm:text-6xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/48 sm:text-base">{description}</p>
      </div>
      {action}
    </div>
  );
}
