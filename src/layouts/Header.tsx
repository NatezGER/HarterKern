import { Menu, Timer, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { brand, navigationItems } from "@/constants/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { SeasonSelector } from "@/components/common/SeasonSelector";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="app-header sticky top-0 z-40 border-b backdrop-blur-2xl transition-colors">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12">
        <NavLink to="/" onClick={() => setIsOpen(false)} className="flex shrink-0 items-center gap-3">
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
                isActive && "season-nav-active text-white",
              )}
            >
              {({ isActive }) => (
                <>
                  {label}
                  {isActive && <span className="season-nav-indicator absolute inset-x-5 -bottom-[21px] h-0.5" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SeasonSelector />
          <Button size="sm" asChild>
            <Link to="/events/live">
              <Timer className="size-4" />
              <span className="hidden sm:inline">Zeit eintragen</span>
            </Link>
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
                  isActive && "season-mobile-nav-active",
                )}
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
