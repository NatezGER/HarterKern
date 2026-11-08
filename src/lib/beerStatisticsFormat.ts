import { formatTime } from "@/utils/format";
import { beerLitersForAttempts } from "@/lib/beerVolume";

export const beerTime = (hundredths: number | null) => hundredths == null ? "—" : formatTime(hundredths / 100);
export const beerLiters = (attempts: number) => beerLitersForAttempts(attempts).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " L";

export function beerEffectLabel(hundredths: number) {
  const seconds = (Math.abs(hundredths) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(hundredths) < 0.5) return "Gleichauf mit Gesamt-Ø (auf 0,01 s gerundet)";
  return seconds + (hundredths < 0 ? " s schneller als Gesamt-Ø" : " s langsamer als Gesamt-Ø");
}
