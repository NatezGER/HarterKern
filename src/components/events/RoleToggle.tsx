import { Shield, User } from "lucide-react";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { cn } from "@/lib/cn";
import type { LiveRole } from "@/types/liveEvent";

export function RoleToggle() {
  const { state, setRole } = useLiveEvent();
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-black/25 p-1" aria-label="Demo-Rolle">
      {([
        ["user", User, "Nutzer"],
        ["admin", Shield, "Admin"],
      ] as const).map(([role, Icon, label]) => (
        <button
          key={role}
          type="button"
          onClick={() => setRole(role as LiveRole)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
            state.role === role ? "bg-gold-400 text-black" : "text-white/45 hover:text-white",
          )}
        >
          <Icon className="size-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}
