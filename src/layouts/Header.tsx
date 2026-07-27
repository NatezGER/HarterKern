import { Menu, Timer, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { brand, navigationItems } from "@/constants/navigation";
import { appMeta } from "@/constants/content";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { SubmitAttemptDialog } from "@/components/submission/SubmitAttemptDialog";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-background/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
          <span className="grid size-10 skew-x-[-8deg] place-items-center rounded-lg bg-gold-400 font-display text-lg font-black text-black shadow-gold-sm">
            {brand.shortName}
          </span>
          <span className="hidden sm:block">
            <span className="block font-display text-lg font-black uppercase leading-none tracking-wide">{brand.name}</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-gold-400">{brand.subtitle}</span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 lg:flex">
          {navigationItems.map(({ href, label }) => (
            <NavLink
              key={href}
              to={href}
              className={({ isActive }) => cn(
                "relative rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white/45 transition hover:text-white",
                isActive && "bg-white/[0.07] text-white",
              )}
            >
              {({ isActive }) => (
                <>
                  {label}
                  {isActive && <span className="absolute inset-x-5 -bottom-[21px] h-0.5 bg-gold-400 shadow-gold-sm" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-gold-400/20 bg-gold-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gold-300 sm:block">
            {appMeta.season}
          </span>
          <Button size="sm" onClick={() => setSubmissionOpen(true)}>
            <Timer className="size-4" />
            <span className="hidden sm:inline">Zeit eintragen</span>
          </Button>
          <button
            type="button"
            aria-label="Navigation öffnen"
            onClick={() => setIsOpen((value) => !value)}
            className="grid size-10 place-items-center rounded-full border border-white/10 lg:hidden"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <nav className="border-t border-white/[0.07] bg-background px-5 py-4 lg:hidden">
          <div className="mx-auto grid max-w-[1600px] gap-1">
            {navigationItems.map(({ href, label, icon: Icon }) => (
              <NavLink
                key={href}
                to={href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/55",
                  isActive && "bg-gold-400/10 text-gold-300",
                )}
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
      <SubmitAttemptDialog open={submissionOpen} onClose={() => setSubmissionOpen(false)} />
    </header>
  );
}
