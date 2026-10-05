import { Beer } from "lucide-react";
import { cn } from "@/lib/cn";
import { resolveBeerVolumeMilestone } from "@/lib/beerVolume";

const liters = (value: number) => value.toLocaleString("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function BeerVolumeCard({ validAttempts, contextLabel, compact = false, className }: {
  validAttempts: number;
  contextLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  const volume = resolveBeerVolumeMilestone(validAttempts);
  return <article className={cn("panel overflow-hidden p-5 sm:p-7", className)} data-beer-volume>
    <div className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-gold-300/20 bg-gold-300/10 text-gold-200"><Beer className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300/70">{contextLabel ?? "Gemeinsam getrunken"}</p>
        <p className="mt-1 font-display text-3xl font-black text-white sm:text-4xl">{liters(volume.liters)} L</p>
        {!compact && <p className="mt-1 text-xs text-white/40">{validAttempts.toLocaleString("de-DE")} gültige offizielle Versuche · je 0,2 L</p>}
      </div>
      {volume.reached && <span className="text-3xl" aria-label={`Erreicht: ${volume.reached.label}`}>{volume.reached.emoji}</span>}
    </div>
    {volume.reached && <p className="mt-3 text-xs text-white/40">Zuletzt erreicht: <strong className="text-white/65">{volume.reached.label} · {volume.reached.liters.toLocaleString("de-DE")} L</strong></p>}
    {volume.next ? <div className="mt-5">
      <div className="flex items-end justify-between gap-3 text-xs">
        <span className="text-white/50">Nächstes Ziel: <strong className="text-white/75">{volume.next.label}</strong></span>
        <span className="shrink-0 tabular-nums text-gold-200">{liters(volume.liters)} / {volume.next.liters.toLocaleString("de-DE")} L</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={Math.round(volume.progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Fortschritt bis ${volume.next.label}`}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-gold-300" style={{ width: `${volume.progress}%` }} />
      </div>
      {!compact && <p className="mt-2 text-[11px] text-white/35">Noch {liters(volume.remainingLiters)} L bis {volume.next.label}.</p>}
    </div> : <p className="mt-5 text-sm font-bold text-gold-200">1.000.000 L – gemeinsamer Endgegner erreicht.</p>}
  </article>;
}
