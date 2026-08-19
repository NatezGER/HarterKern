export function nextBadgeRaritySelection(current: string | null, selected: string) {
  return current === selected ? null : selected;
}
