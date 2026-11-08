import { useId, useState } from "react";
import { Crown } from "lucide-react";
import type { BeerRankingCategory, BeerRankingRow, BeerStatistics } from "@/types/beerStatistics";
import { BeerBottle } from "./BeerBottle";
import { BeerBrandDetail } from "./BeerBrandDetail";
import { beerTime, beerEffectLabel } from "@/lib/beerStatisticsFormat";
import { Button } from "@/components/ui/button";

const categories: { key: BeerRankingCategory; label: string }[] = [
  { key: "power", label: "Schnellstes Bier – Top-5-Powerwert" },
  { key: "record", label: "Schnellster Einzelrekord" },
  { key: "volume", label: "Meiste Liter" },
  { key: "turbo", label: "Größter Bier-Turbo" },
];
function rankingValue(row: BeerRankingRow, category: BeerRankingCategory) {
  if (category === "volume") return row.value.toLocaleString("de-DE", {minimumFractionDigits:1,maximumFractionDigits:1})+" L";
  if (category === "turbo") return beerTime(Math.abs(row.value))+" schneller";
  return (category === "power" ? "Ø " : "")+beerTime(row.value);
}
function rankingNote(row: BeerRankingRow, category: BeerRankingCategory) {
  return category === "power" ? row.playerCount+"/5 Spieler" : row.playerName ?? "Inklusive Gäste und AK";
}
const podiumStyles = [
  "border-gold-300/50 bg-gradient-to-b from-gold-300/20 to-gold-500/5 sm:pb-12",
  "border-slate-200/25 bg-gradient-to-b from-slate-200/15 to-slate-500/5 mt-8 sm:pb-7",
  "border-orange-400/30 bg-gradient-to-b from-orange-500/15 to-orange-800/5 mt-12",
];
export function BeerStatisticsContent({ data }: { data: BeerStatistics }) {
  const [category, setCategory] = useState<BeerRankingCategory>("power");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const ranking = data.rankings[category];
  const byBrand = new Map(data.brands.map(brand => [brand.brand,brand]));
  // Keep a valid selection across categories/scopes; derive a safe fallback without effects.
  const selected = (selectedBrand ? byBrand.get(selectedBrand) : undefined)
    ?? byBrand.get(ranking[0]?.brand) ?? data.brands[0];
  const podium = [ranking[1],ranking[0],ranking[2]].filter((row): row is BeerRankingRow => Boolean(row));
  return <div className="min-w-0 space-y-8" data-beer-statistics>
    <section className="panel min-w-0 p-3 sm:p-6" aria-label="Bierpodium und Rangliste">
      <p className="text-xs font-bold uppercase tracking-widest text-gold-300">Bier-Rekordbuch</p>
      <h2 className="display-title mt-1 text-3xl">Das Bierpodium</h2>
      <label className="mt-4 block text-xs text-white/60">Rankingkategorie
        <select className="mt-2 block min-h-11 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-zinc-950 p-2 text-sm text-white sm:p-3"
          value={category} onChange={event => { setCategory(event.target.value as BeerRankingCategory); setExpanded(false); }}>
          {categories.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </label>
      <p className="mt-3 text-xs leading-5 text-white/50">{category === "power"
        ? "Bis zu fünf unterschiedliche Spieler, jeder nur mit seiner Bestzeit. Offiziell ab zwei Spielern; keine Auffüllung oder Gewichtung."
        : category === "record" ? "Jede Marke tritt einmal mit ihrem schnellsten regulären Einzelversuch an."
        : category === "volume" ? "Gültige dokumentierte Versuche × 0,2 L. Gäste und AK zählen mit; DNF nicht."
        : "Stärkste qualifizierte Verbesserung pro Marke, aus allen Spieler-Marken-Paaren. Kein Nachweis einer Wirkung."}</p>
      {!ranking.length && <p className="py-12 text-center text-sm text-white/50">Noch keine qualifizierte Marke für diese Wertung.</p>}
      <div className="mt-6 grid min-w-0 grid-cols-3 items-start gap-2 sm:gap-4" data-beer-podium>
        {podium.map(row => <button key={row.brand} type="button" aria-pressed={selected?.brand === row.brand}
          aria-controls={detailId} aria-label={"Platz "+row.rank+": "+row.brand+" im Detail"}
          onClick={() => setSelectedBrand(row.brand)}
          className={"flex min-w-0 flex-col items-center rounded-2xl border p-2 pb-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 sm:p-4 "+podiumStyles[row.rank-1]+(row.rank===1 && podium.length===1 ? " col-start-2" : "")}>
          <span className="mb-2 flex h-7 items-center gap-1 text-sm font-bold text-white/80">{row.rank===1 && <Crown className="size-5 text-gold-300" aria-hidden="true" />}<span>#{row.rank}</span></span>
          <BeerBottle path={byBrand.get(row.brand)?.imagePath ?? null} size="podium" />
          <strong className="mt-3 w-full text-xs [overflow-wrap:anywhere] sm:text-lg">{row.brand}</strong>
          <span className="mt-2 w-full text-xs font-bold tabular-nums text-gold-200 [overflow-wrap:anywhere] sm:text-base">{rankingValue(row,category)}</span>
          <span className="mt-1 w-full text-[10px] text-white/55 [overflow-wrap:anywhere] sm:text-xs">{rankingNote(row,category)}</span>
        </button>)}
      </div>
      <h3 className="mt-7 font-bold">Markenrangliste</h3>
      <ol className="mt-3 space-y-2" data-beer-ranking>
        {(expanded ? ranking : ranking.slice(0,10)).map(row => <li key={row.brand}>
          <button type="button" aria-pressed={selected?.brand===row.brand} aria-controls={detailId}
            onClick={() => setSelectedBrand(row.brand)}
            className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300">
            <span className="w-6 shrink-0 font-bold text-gold-200">{row.rank}.</span>
            <BeerBottle path={byBrand.get(row.brand)?.imagePath ?? null} />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]"><strong className="block text-sm">{row.brand}</strong>
              <span className="block text-sm tabular-nums text-gold-200">{rankingValue(row,category)}</span>
              <span className="block text-xs text-white/50">{rankingNote(row,category)}</span>
            </span>
          </button>
        </li>)}
      </ol>
      {ranking.length>10 && <Button className="mt-4 w-full" variant="outline" aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}>{expanded ? "Auf zehn Biere reduzieren" : "Weitere Biere anzeigen"}</Button>}
    </section>
    <section id={detailId} className="panel min-w-0 space-y-5 p-4 sm:p-6" aria-label="Bier im Detail">
      <h2 className="display-title text-2xl">Bier im Detail</h2>
      <label className="block text-xs text-white/60">Biermarke auswählen
        <select value={selected?.brand ?? ""} onChange={event => setSelectedBrand(event.target.value)}
          className="mt-2 block min-h-11 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white">
          {data.brands.map(beer => <option key={beer.brand} value={beer.brand}>{beer.brand}</option>)}
        </select>
      </label>
      {selected && <BeerBrandDetail key={selected.brand} beer={selected} />}
    </section>
    <details className="panel min-w-0 p-4 sm:p-6">
      <summary className="cursor-pointer py-2 font-bold focus-visible:outline focus-visible:outline-gold-300">Spieler & Bier</summary>
      <div className="mt-4 grid min-w-0 gap-5 md:grid-cols-2">
        <section className="min-w-0"><h3 className="font-semibold">Lieblingsbiere</h3>
          <p className="mt-2 text-xs text-white/50">Niedrigster persönlicher Bier-Ø ab zwei Leistungsversuchen.</p>
          <ul className="mt-3 space-y-3">{data.favorites.map(p => <li key={p.playerId} className="text-sm [overflow-wrap:anywhere]">
            <strong>{p.name}</strong>: {p.brand} · Ø {beerTime(p.averageHundredths)}
            <p className="text-xs text-white/50">{beerEffectLabel(p.effectHundredths)}</p>
          </li>)}</ul>
        </section>
        <section className="min-w-0"><h3 className="font-semibold">Bier-Sommelier</h3>
          <ol className="mt-3 space-y-3">{data.variety.map((p,index) => <li key={p.playerId} className="text-sm [overflow-wrap:anywhere]">
            <strong>{index+1}. {p.name}</strong> · {p.brands} Sorten · {p.attempts} Versuche
          </li>)}</ol>
        </section>
      </div>
    </details>
  </div>;
}
