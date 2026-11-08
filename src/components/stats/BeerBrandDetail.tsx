import { Link } from "react-router-dom";
import type { BeerBrandStatistic, BeerFavorite } from "@/types/beerStatistics";
import { BeerBottle } from "./BeerBottle";
import { beerTime, beerLiters, beerEffectLabel } from "@/lib/beerStatisticsFormat";

function Effects({ title, players }: { title: string; players: BeerFavorite[] }) {
  return <section className="min-w-0 rounded-xl bg-white/[0.03] p-4">
    <h4 className="font-bold">{title}</h4>
    {!players.length && <p className="mt-2 text-xs text-white/50">Noch kein qualifiziertes Ergebnis.</p>}
    <ol className="mt-3 space-y-3">{players.map(p => <li key={p.playerId}>
      <Link to={"/player/"+p.playerId} className="text-gold-200 underline">{p.name}</Link>
      <p className="text-sm">{beerEffectLabel(p.effectHundredths)}</p>
      <p className="text-xs text-white/50">Bier-Ø {beerTime(p.averageHundredths)} · {p.attempts} Versuche · Gesamt-Ø {beerTime(p.overallAverageHundredths)} ({p.overallAttempts})</p>
    </li>)}</ol>
  </section>;
}
function PersonalRecords({ players }: { players: BeerFavorite[] }) {
  return <ol className="mt-3 space-y-3">{players.map((p,index) => <li key={p.playerId} className="flex min-w-0 flex-wrap justify-between gap-2 text-sm">
    <Link to={"/player/"+p.playerId} className="min-w-0 text-gold-200 underline">{index+1}. {p.name}</Link>
    <span className="tabular-nums">{beerTime(p.bestHundredths)}</span>
  </li>)}</ol>;
}
export function BeerBrandDetail({ beer }: { beer: BeerBrandStatistic }) {
  return <article data-beer-detail={beer.brand} className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
    <div className="grid min-w-0 items-center gap-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
      <div className="flex justify-center"><BeerBottle path={beer.imagePath} size="detail" /></div>
      <div className="min-w-0"><h3 className="display-title text-3xl">{beer.brand}</h3>
        <p className="mt-2 text-2xl font-bold text-gold-200">Powerwert {beerTime(beer.powerValue)}</p>
        <p className="text-sm text-white/60">{beer.powerPlayerCount}/5 Spieler{!beer.powerQualified && " · Noch nicht qualifiziert (mindestens 2 Spieler)"}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-white/50">Beste Einzelzeit</dt><dd>{beerTime(beer.bestHundredths)}</dd></div>
          <div><dt className="text-white/50">Dokumentierte Menge</dt><dd>{beerLiters(beer.attempts)}</dd></div>
          <div><dt className="text-white/50">Events</dt><dd>{beer.events}</dd></div>
          <div><dt className="text-white/50">Regulärer Gesamt-Ø</dt><dd>{beerTime(beer.averageHundredths)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-white/50">{beer.attempts} Versuche · {beer.people} Personen · {beer.performanceAttempts} Leistungsversuche</p>
      </div>
    </div>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <section className="min-w-0 rounded-xl bg-white/[0.03] p-4">
        <h4 className="font-bold">Die schnellsten Bezwinger</h4>
        {!beer.fastestPlayers.length && <p className="mt-2 text-xs text-white/50">Noch keine reguläre Einzelzeit.</p>}
        <PersonalRecords players={beer.fastestPlayers.slice(0,3)} />
        <details className="mt-4">
          <summary className="cursor-pointer py-2 text-sm text-gold-200 focus-visible:outline focus-visible:outline-gold-300">Alle Spieler & Powerwert-Belege</summary>
          <p className="mt-2 text-xs text-white/50">Die ersten {beer.powerPlayerCount} unterschiedlichen Spieler bilden den Powerwert. Jeder zählt nur mit seiner Bestzeit.</p>
          <PersonalRecords players={beer.fastestPlayers} />
          <ul className="mt-4 space-y-2 text-xs text-white/60">{beer.players.map(p => <li key={p.playerId}>{p.name}: Ø {beerTime(p.averageHundredths)} · {p.attempts} Versuche · {beerEffectLabel(p.effectHundredths)}{p.attempts<2 ? " · Rohwert, kein qualifizierter Effekt" : ""}</li>)}</ul>
        </details>
      </section>
      <section className="min-w-0 rounded-xl bg-white/[0.03] p-4">
        <h4 className="font-bold">Die Stammkunden</h4>
        <ol className="mt-3 space-y-3">{beer.customers.map((p,index) => <li key={p.personKey}>
          <p className="text-sm">{index+1}. {p.name}{p.isGuest ? " (Gast)" : p.isAk ? " (AK)" : ""}</p>
          <strong className="text-xl text-gold-200">{beerLiters(p.attempts)}</strong><span className="ml-2 text-xs text-white/50">{p.attempts} Versuche</span>
        </li>)}</ol>
      </section>
      <Effects title="Bier-Turbo" players={beer.turbo} />
      <Effects title="Bier-Bremse" players={beer.brake} />
    </div>
    <p className="text-xs text-white/45">Effektvergleiche ab 2 Versuchen mit dieser Marke. Gesamt-Ø inklusive gültiger regulärer Eventzeiten ohne Bierangabe. Kein Nachweis einer ursächlichen Wirkung von Alkohol.</p>
    <details className="rounded-xl border border-white/10 p-4">
      <summary className="cursor-pointer py-2 font-semibold focus-visible:outline focus-visible:outline-gold-300">Event-Historie ({beer.eventDetails.length})</summary>
      <ul className="mt-3 space-y-3">{beer.eventDetails.map(e => <li key={e.eventId} className="text-sm">
        <Link to={"/events/"+e.eventId} className="text-gold-200 underline">{e.name}</Link>
        <p className="text-xs text-white/50">{e.date} · {e.attempts} Versuche · {beerLiters(e.attempts)}</p>
      </li>)}</ul>
    </details>
  </article>;
}
