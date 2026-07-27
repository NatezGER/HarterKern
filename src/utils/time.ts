export function parseTimeToHundredths(input: string) {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 300) return null;
  return Math.round(value * 100);
}

export const hundredthsToSeconds = (value: number | null | undefined) =>
  value == null ? 0 : value / 100;
