export function mostWantedProgressPercent(reached: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, reached / total * 100));
}
