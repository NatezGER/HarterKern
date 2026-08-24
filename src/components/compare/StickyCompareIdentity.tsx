import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import type { Player } from "@/types";

export function StickyCompareIdentity({
  playerA,
  playerB,
  visible,
}: {
  playerA: Player | null;
  playerB: Player | null;
  visible: boolean;
}) {
  if (!playerA && !playerB) return null;
  return (
    <div
      aria-hidden={!visible}
      className={`sticky top-20 z-30 -mx-2 h-0 transition-opacity lg:hidden ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="app-header mx-auto flex h-14 max-w-sm items-center justify-between gap-2 rounded-b-2xl border border-t-0 px-3 shadow-2xl backdrop-blur-2xl">
        <Identity player={playerA} align="left" />
        <span className="context-accent-text shrink-0 font-display text-xs font-black">VS</span>
        <Identity player={playerB} align="right" />
      </div>
    </div>
  );
}

function Identity({ player, align }: { player: Player | null; align: "left" | "right" }) {
  if (!player) return <span className="min-w-0 flex-1 text-center text-xs text-white/30">Offen</span>;
  return (
    <span className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <ProfileAvatar id={player.id} name={player.name} url={player.avatarUrl} className="size-8" />
      <span className="truncate text-xs font-bold">{player.name}</span>
    </span>
  );
}
