import { CircleDot, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { BingoField, PlayerBingo } from "@/types/historyProfiles";
import type { BingoTier } from "@/types/pr8";
import { formatDate, formatTime } from "@/utils/format";

const tierNames: Record<BingoTier, string> = {
  open: "Offen",
  bronze: "Bronze",
  silver: "Silber",
  gold: "Gold",
  diamond: "Diamond",
};

const tierMarks: Record<BingoTier, string> = {
  open: "–",
  bronze: "B",
  silver: "S",
  gold: "G",
  diamond: "D",
};

const tierClasses: Record<BingoTier, string> = {
  open: "border-white/[0.07] bg-black/25 text-white/35 hover:border-white/20",
  bronze: "border-orange-300/40 bg-gradient-to-br from-amber-950/80 to-orange-500/20 text-orange-100 shadow-[inset_0_1px_rgba(255,255,255,0.12)]",
  silver: "border-slate-200/50 bg-gradient-to-br from-slate-500/35 to-slate-100/10 text-slate-50 shadow-[inset_0_1px_rgba(255,255,255,0.2)]",
  gold: "border-yellow-200/55 bg-gradient-to-br from-amber-500/40 to-yellow-200/15 text-yellow-50 shadow-[inset_0_1px_rgba(255,255,255,0.28),0_0_12px_rgba(250,204,21,0.08)]",
  diamond: "border-cyan-200/55 bg-gradient-to-br from-indigo-700/45 to-cyan-200/20 text-cyan-50 shadow-[inset_0_1px_rgba(255,255,255,0.3),0_0_14px_rgba(103,232,249,0.1)]",
};

export function PersonalBingo({ data }: { data: PlayerBingo }) {
  const [selected, setSelected] = useState<BingoField | null>(null);
  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Metric label="Endungen" value={`${data.summary.collectedEndings} / 100`} />
        <Metric label="Mind. Bronze" value={data.summary.bronzeFields} />
        <Metric label="Mind. Silber" value={data.summary.silverFields} />
        <Metric label="Goldfelder" value={data.summary.goldFields} />
        <Metric label="Bronze-BINGOs" value={data.summary.bronzeLines} />
        <Metric label="Silber-BINGOs" value={data.summary.silverLines} />
        <Metric label="Gold-BINGOs" value={data.summary.goldLines} />
      </div>

      <div className="mx-auto mt-5 w-full max-w-3xl" role="grid" aria-label="Persönliches BINGO mit den Endungen 00 bis 99">
        <div className="grid min-w-0 grid-cols-10 gap-0.5 sm:gap-1">
          {data.fields.map((field) => (
            <button
              key={field.ending}
              type="button"
              role="gridcell"
              aria-label={fieldLabel(field)}
              aria-expanded={selected?.ending === field.ending}
              onClick={() => setSelected(field)}
              onFocus={() => setSelected(field)}
              className={cn(
                "group relative aspect-square min-w-0 rounded-[5px] border p-0 text-[8px] font-black tabular-nums transition motion-reduce:transition-none focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-200 sm:rounded-lg sm:text-xs",
                tierClasses[field.tier],
              )}
            >
              <span>{field.label}</span>
              <span aria-hidden="true" className="absolute bottom-px right-px text-[5px] leading-none opacity-65 sm:bottom-1 sm:right-1 sm:text-[7px]">{tierMarks[field.tier]}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="sr-only">
        {data.fields.map((field) => <li key={`bingo-text-${field.ending}`}>{fieldLabel(field)}</li>)}
      </ul>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/45 sm:text-xs" aria-label="BINGO-Legende">
        {(["open", "bronze", "silver", "gold", "diamond"] as BingoTier[]).map((tier) => (
          <span key={tier} className="inline-flex items-center gap-1.5"><span className={cn("grid size-5 place-items-center rounded border text-[7px] font-black", tierClasses[tier])}>{tierMarks[tier]}</span>{tierNames[tier]} · {tier === "open" ? "0" : tier === "bronze" ? "1" : tier === "silver" ? "2" : tier === "gold" ? "3–4" : "5+"} Treffer</span>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-white/35">22 mögliche Linien: zehn Reihen, zehn Spalten und zwei vollständige Diagonalen. Linienzahlen bauen kumulativ aufeinander auf.</p>
      {selected && <BingoFieldDetail field={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/30">{label}</p><p className="mt-1 font-display text-xl font-black">{value}</p></div>;
}

function BingoFieldDetail({ field, onClose }: { field: BingoField; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4" aria-live="polite" aria-label={`Details zur Endung ${field.label}`}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Endung</p><h3 className="font-display text-3xl font-black">.{field.label} · {tierNames[field.tier]}</h3><p className="mt-1 text-xs text-white/45">{field.hitCount} {field.hitCount === 1 ? "eigener Treffer" : "eigene Treffer"}</p></div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="BINGO-Detail schließen"><X className="size-4" /></Button>
      </div>
      {field.hits.length === 0 ? <p className="mt-5 flex items-center gap-2 text-sm text-white/35"><CircleDot className="size-4" /> Noch kein qualifizierter Treffer.</p> : (
        <ol className="mt-5 grid gap-2">
          {field.hits.map((hit) => (
            <li key={hit.id} className="grid gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs sm:grid-cols-[6rem_7rem_1fr_auto] sm:items-center">
              <strong className="font-display text-lg text-gold-200">{formatTime(hit.timeHundredths / 100)}</strong>
              <span className="text-white/55">{formatDate(hit.occurredDate)}</span>
              <span className="min-w-0 truncate text-white/45">{hit.eventId ? <Link className="hover:text-gold-200 hover:underline" to={`/events/${hit.eventId}`}>{hit.sourceLabel}</Link> : hit.sourceLabel}</span>
              <span className="text-white/30">{hit.hasExactTime ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(hit.occurredAt)) : "Uhrzeit nicht überliefert"}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function fieldLabel(field: BingoField) {
  const hits = field.hitCount === 0 ? "nicht erreicht" : field.hitCount === 1 ? "einmal erreicht" : field.hitCount === 2 ? "zweimal erreicht" : `${field.hitCount}-mal erreicht`;
  return `Endung ${field.label}, ${tierNames[field.tier]}, ${hits}`;
}
