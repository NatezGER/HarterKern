export function resolveMilestoneProgress<T extends { threshold: number }>({
  definitions, currentValue, direction,
}: { definitions: readonly T[]; currentValue: number | null; direction: "up" | "down" }) {
  const sorted = [...definitions].sort((a,b) => direction === "up" ? a.threshold-b.threshold : b.threshold-a.threshold);
  const valid = currentValue != null && Number.isFinite(currentValue) && currentValue >= 0;
  const achievedMilestones = valid ? sorted.filter(m => direction === "up"
    ? currentValue >= m.threshold : currentValue <= m.threshold) : [];
  const achievedMilestone = achievedMilestones[achievedMilestones.length - 1] ?? null;
  const nextMilestone = sorted[achievedMilestones.length] ?? null;
  const complete = valid && sorted.length > 0 && nextMilestone == null;
  let progress = complete ? 1 : 0;
  if (valid && nextMilestone) {
    // Up begins at zero. Down has no invented slow baseline before its first tier.
    const previous = achievedMilestone?.threshold ?? (direction === "up" ? 0 : null);
    if (previous != null && previous !== nextMilestone.threshold) {
      progress = direction === "up"
        ? (currentValue-previous)/(nextMilestone.threshold-previous)
        : (previous-currentValue)/(previous-nextMilestone.threshold);
    }
  }
  const remaining = !valid ? null : nextMilestone
    ? Math.round(Math.max(0, direction === "up" ? nextMilestone.threshold-currentValue : currentValue-nextMilestone.threshold)*1e8)/1e8
    : 0;
  return { achievedMilestone, nextMilestone, achievedMilestones,
    progress: Math.max(0,Math.min(1,progress)), remaining, complete };
}
