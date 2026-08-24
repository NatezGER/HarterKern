import { UserRoundSearch } from "lucide-react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { getComparePlayerOptions } from "@/lib/playerCompare";
import type { Player } from "@/types";

interface PlayerSelectorProps {
  players: Player[];
  player: Player | null;
  excludedPlayerId?: string | null;
  label: string;
  onChange: (playerId: string) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function PlayerSelector({
  players,
  player,
  excludedPlayerId,
  label,
  onChange,
  compact = false,
  disabled = false,
}: PlayerSelectorProps) {
  const options = getComparePlayerOptions(players, excludedPlayerId);
  return (
    <Select value={player?.id} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "min-w-0 max-w-full focus-visible:ring-2 focus-visible:ring-gold-400",
          compact
            ? "h-9 w-full justify-center rounded-xl px-3 text-xs"
            : "h-auto w-full rounded-2xl border-white/[0.08] bg-black/20 p-3 sm:p-4",
        )}
      >
        {player ? (
          <span className="flex min-w-0 items-center gap-2 text-left sm:gap-3">
            <ProfileAvatar
              id={player.id}
              name={player.name}
              url={player.avatarUrl}
              className={compact ? "size-6" : "size-10 sm:size-12"}
            />
            <span className="min-w-0">
              <span className="block truncate font-display font-black uppercase text-white">
                {player.name}
              </span>
              {!compact && <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">Spieler wechseln</span>}
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-2 text-left text-white/60">
            <UserRoundSearch className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
        )}
      </SelectTrigger>
      <SelectContent className="max-h-80 min-w-[15rem]">
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <span className="flex items-center gap-3">
              <ProfileAvatar id={option.id} name={option.name} url={option.avatarUrl} className="size-8" />
              <span className="font-semibold">{option.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
