import { useState } from "react";
import { beerRankingModes, rankPlayerBeers, type BeerRankingMode } from "@/lib/playerBeerRanking";
import type { PlayerBeerProfile } from "@/services/playerBeerService";
import { BeerBottle } from "@/components/stats/BeerBottle";
import { BeerVolumeCard } from "@/components/stats/BeerVolumeCard";
import { BeerVolumeArtwork } from "@/components/stats/BeerVolumeArtwork";
import { beerTime } from "@/lib/beerStatisticsFormat";
export function PlayerBeerSections({ data, scope }: { data: PlayerBeerProfile; scope: string }) {
  const [mode, setMode] = useState<BeerRankingMode>("fastest");
  const [showAll, setShowAll] = useState(false);
  const effectiveMode = data.brandRankings ? mode : "fastest";
  const config = beerRankingModes[effectiveMode];
  const beers = data.brandRankings
    ? rankPlayerBeers(data.brandRankings, effectiveMode).map(beer => ({ ...beer, rankingValue: beer[config.field] }))
    : data.beers.map(beer => ({ ...beer, rankingValue: beer.bestHundredths }));
  return <section aria-label="Persönliche Bierstatistik" className="grid min-w-0 gap-4 lg:grid-cols-2">
    <div className="panel min-w-0 p-5">
      <p className="text-xs text-white/50">{scope} · reguläre Eventversuche</p>
      <h2 className="display-title mt-1 text-2xl">{config.title}</h2>
      <label className="mt-4 block text-xs text-white/60">Bierwertung<select aria-label="Bierwertung" className="mt-1 block min-h-11 w-full rounded-xl border border-white/15 bg-[#151713] px-3 text-sm text-white" value={effectiveMode} onChange={e => { setMode(e.target.value as BeerRankingMode); setShowAll(false); }}>{Object.entries(beerRankingModes).map(([key, option]) => <option key={key} value={key} disabled={!data.brandRankings && key !== "fastest"}>{option.label}</option>)}</select></label>
      {!data.brandRankings && <p className="mt-2 text-xs text-white/45">Weitere Wertungen werden nach der Datenaktualisierung verfügbar.</p>}
      {!beers.length ? <p className="mt-4 text-sm text-white/50">Noch keine gültige Zeit mit dokumentierter Biermarke.</p> :
        <ol className="mt-4 space-y-3">{(showAll ? beers : beers.slice(0, 3)).map((beer, index) => <li key={beer.brand} className="flex min-w-0 items-center gap-3">
          <span className="font-bold text-gold-200">{index + 1}.</span><BeerBottle path={beer.imagePath} />
          <div className="min-w-0"><p className="break-words font-bold [overflow-wrap:anywhere]">{beer.brand}</p>
            <p className="text-xl font-bold text-gold-200">{effectiveMode === "most" ? `${beer.attempts} Versuche` : beerTime(beer.rankingValue)}</p>
            <p className="text-xs text-white/50">{beer.attempts} gültige Versuche</p></div>
        </li>)}</ol>}
      {beers.length > 3 && <button type="button" aria-expanded={showAll} className="mt-4 min-h-11 text-sm text-gold-200 underline" onClick={() => setShowAll(value => !value)}>{showAll ? "Weniger anzeigen" : "Alle anzeigen"}</button>}
    </div>
    <BeerVolumeCard validAttempts={data.validAttempts} contextLabel="Persönlich getrunken" personalArtwork compact className="min-w-0" artwork={<BeerVolumeArtwork attempts={data.validAttempts} contain />} />
  </section>;
}
