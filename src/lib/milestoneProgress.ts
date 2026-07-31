export function calculateMilestoneProgress(current: number, target: number) {
  if (target <= 0 || current <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}
