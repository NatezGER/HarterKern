import type { PlayerBeerProfile } from "@/services/playerBeerService";
import { BeerBottle } from "@/components/stats/BeerBottle";
import { BeerVolumeCard } from "@/components/stats/BeerVolumeCard";
import { BeerVolumeArtwork } from "@/components/stats/BeerVolumeArtwork";
import { beerTime } from "@/lib/beerStatisticsFormat";
export function PlayerBeerSections({ data, scope }: { data: PlayerBeerProfile; scope: string }) {
  return <section aria-label="Persönliche Bierstatistik" className="grid min-w-0 gap-4 lg:grid-cols-2">
    <div className="panel min-w-0 p-5">
      <p className="text-xs text-white/50">{scope} · reguläre Eventversuche</p>
      <h2 className="display-title mt-1 text-2xl">Meine schnellsten Biere</h2>
      {!data.beers.length ? <p className="mt-4 text-sm text-white/50">Noch keine gültige Zeit mit dokumentierter Biermarke.</p> :
        <ol className="mt-4 space-y-3">{data.beers.map((beer, index) => <li key={beer.brand} className="flex min-w-0 items-center gap-3">
          <span className="font-bold text-gold-200">{index + 1}.</span><BeerBottle path={beer.imagePath} />
          <div className="min-w-0"><p className="break-words font-bold [overflow-wrap:anywhere]">{beer.brand}</p>
            <p className="text-xl font-bold text-gold-200">{beerTime(beer.bestHundredths)}</p>
            <p className="text-xs text-white/50">{beer.attempts} gültige Versuche</p></div>
        </li>)}</ol>}
    </div>
    <BeerVolumeCard validAttempts={data.validAttempts} contextLabel="Persönlich getrunken" compact className="min-w-0" artwork={<BeerVolumeArtwork attempts={data.validAttempts} />} />
  </section>;
}
