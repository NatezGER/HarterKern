import type { BeerStatistics } from "@/types/beerStatistics";
import { BeerVolumeCard } from "./BeerVolumeCard";
import { MilestoneArtwork } from "./MilestoneArtwork";
import { useMilestoneContent } from "@/hooks/useMilestoneContent";
import { beerLitersForAttempts, resolveBeerVolumeMilestone } from "@/lib/beerVolume";
import { beerEffectLabel } from "@/lib/beerStatisticsFormat";
import { formatTime } from "@/utils/format";

const liters = (attempts: number) => beerLitersForAttempts(attempts).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " L";
const time = (hundredths: number | null) => hundredths == null ? "—" : formatTime(hundredths / 100);

export function BeerStatisticsContent({ data }: { data: BeerStatistics }) {
  const content = useMilestoneContent();
  const volume = resolveBeerVolumeMilestone(data.summary.attempts);
  const milestone = volume.reached ?? volume.next;
  return <div className="min-w-0 space-y-8" data-beer-statistics>
    <section className="grid min-w-0 gap-4 lg:grid-cols-2" aria-label="Dokumentiert getrunken">
      <div className="min-w-0">
        <BeerVolumeCard validAttempts={data.summary.attempts} compact contextLabel="Dokumentiert getrunken" />
        <p className="mt-3 text-sm text-white/60">{data.summary.attempts.toLocaleString("de-DE")} gültige dokumentierte Bier-Versuche · {data.summary.brands} Sorten · {data.summary.events} Events</p>
        <p className="mt-2 text-xs leading-5 text-white/40">Menge inklusive Gästen und AK, ohne DNF. Leistung nur reguläre Spieler. Mindestens 2 Versuche für wertende Vergleiche.</p>
      </div>
      {milestone && <div className="min-w-0">
        <MilestoneArtwork kind="beer-volume" assetKey={milestone.assetKey} title={milestone.title} imageUrl={content.data[milestone.id]?.imageUrl} />
        <p className="mt-2 break-words text-xs text-white/50">{volume.reached ? "Bereits erreicht" : "Nächstes Mengenziel"}: {milestone.title}</p>
        {content.error && <p className="mt-2 text-xs text-white/40" role="status">Mengenbild derzeit nicht verfügbar.</p>}
      </div>}
    </section>
    <section className="min-w-0" aria-label="Bier-Rangliste">
      <h2 className="display-title text-2xl">Bier-Rangliste</h2>
      <p className="mt-2 text-xs text-white/45">Sortiert nach dokumentierter Menge. Leistungsplätze nach Ø, Stichprobe und Bestzeit.</p>
      {data.summary.bestBeer && <p className="mt-3 break-words text-sm text-gold-200">Bestes Bier nach qualifiziertem Ø: {data.summary.bestBeer}</p>}
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
        {data.brands.map(beer => <article key={beer.brand} className="panel min-w-0 overflow-hidden p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="min-w-0 break-words font-bold [overflow-wrap:anywhere]">{beer.brand}</h3>
            <strong className="tabular-nums text-gold-200">{liters(beer.attempts)}</strong>
          </div>
          <p className="mt-2 text-xs text-white/45">{beer.attempts} Versuche · {beer.events} Events · {beer.people} dokumentierte Personen</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-white/40">Regulärer Ø</dt><dd>{time(beer.averageHundredths)}</dd></div>
            <div><dt className="text-xs text-white/40">Reguläre Bestzeit</dt><dd>{time(beer.bestHundredths)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-white/45">{beer.qualified
            ? `Leistungsplatz ${beer.performancePosition} · ${beer.performanceAttempts} Leistungsversuche`
            : `Noch nicht qualifiziert · ${beer.performanceAttempts}/2 Leistungsversuche`}</p>
          <p className="mt-4 break-words text-xs leading-5 text-white/65 [overflow-wrap:anywhere]">Meiste getrunken: {beer.mostDrinker.name}{beer.mostDrinker.isGuest ? " (Gast)" : beer.mostDrinker.isAk ? " (AK)" : ""} · {liters(beer.mostDrinker.attempts)}</p>
          <p className="mt-1 break-words text-xs leading-5 text-white/65 [overflow-wrap:anywhere]">Bester Spieler: {beer.bestPlayer
            ? `${beer.bestPlayer.name} · Ø ${time(beer.bestPlayer.averageHundredths)} · ${beer.bestPlayer.attempts} Versuche`
            : "Noch niemand mit 2 Leistungsversuchen"}</p>
        </article>)}
      </div>
    </section>
    <section className="min-w-0" aria-label="Spieler und Bier">
      <h2 className="display-title text-2xl">Spieler & Bier</h2>
      <p className="mt-2 text-xs leading-5 text-white/45">Lieblingsbier = niedrigster qualifizierter Ø. Gesamt-Ø enthält alle gültigen regulären Eventversuche dieses Zeitraums, auch ohne Bierangabe.</p>
      {!data.favorites.length && <p className="mt-4 text-sm text-white/45">Noch kein Lieblingsbier mit mindestens 2 Versuchen.</p>}
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">{data.favorites.map(player => <article key={player.playerId} className="panel min-w-0 p-4 [overflow-wrap:anywhere]">
        <h3 className="font-bold">{player.name}</h3><p className="mt-1 text-sm text-gold-200">{player.brand}</p>
        <p className="mt-2 text-sm">Ø {time(player.averageHundredths)} · {player.attempts} Versuche</p>
        <p className="mt-1 text-xs text-white/45">Gesamt-Ø {time(player.overallAverageHundredths)} · {player.overallAttempts} Versuche</p>
        <p className="mt-2 text-xs text-white/65">{beerEffectLabel(player.effectHundredths)}</p>
      </article>)}</div>
    </section>
    <section className="grid min-w-0 gap-4 md:grid-cols-2" aria-label="Bier Fun-Rankings">
      <div className="panel min-w-0 p-4 sm:p-5"><h2 className="display-title text-xl">Größter Bier-Effekt</h2>
        <p className="mt-2 text-xs text-white/40">Beschreibender Vergleich, kein Nachweis einer Wirkung.</p>
        {!data.effects.length && <p className="mt-4 text-sm text-white/45">Noch kein qualifizierter positiver Bier-Effekt.</p>}
        <ol className="mt-4 space-y-4">{data.effects.map((player, index) => <li key={player.playerId} className="break-words text-sm [overflow-wrap:anywhere]">
          <strong>{index+1}. {player.name}</strong><p className="mt-1 text-xs text-white/60">{player.brand} · {beerEffectLabel(player.effectHundredths)}</p>
        </li>)}</ol>
      </div>
      <div className="panel min-w-0 p-4 sm:p-5"><h2 className="display-title text-xl">Meiste verschiedene Biersorten</h2>
        {!data.variety.length && <p className="mt-4 text-sm text-white/45">Noch keine dokumentierten Sorten regulärer Spieler.</p>}
        <ol className="mt-4 space-y-4">{data.variety.map((player, index) => <li key={player.playerId} className="break-words text-sm [overflow-wrap:anywhere]">
          <strong>{index+1}. {player.name}</strong><p className="mt-1 text-xs text-white/60">{player.brands} Sorten · {player.attempts} dokumentierte Versuche</p>
        </li>)}</ol>
      </div>
    </section>
  </div>;
}
