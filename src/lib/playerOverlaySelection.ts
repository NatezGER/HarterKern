import type { OverlayPlayerOption } from "@/components/progression/PlayerOverlaySelector";

export function toggleOverlayPlayer(options: OverlayPlayerOption[], selectedIds: string[],
  playerId: string, max = 5) {
  const selected = selectedIds.includes(playerId);
  if (!selected && selectedIds.length >= max) return selectedIds;
  const next = selected ? selectedIds.filter((id) => id !== playerId)
    : [...selectedIds, playerId];
  return options.filter(({ id }) => next.includes(id)).map(({ id }) => id);
}
