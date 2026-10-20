import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import type { BeerFavorite, BeerStatistics } from "@/types/beerStatistics";
import { BeerBottle } from "./BeerBottle";
import { beerLitersForAttempts } from "@/lib/beerVolume";
import { beerEffectLabel } from "@/lib/beerStatisticsFormat";
import { formatTime } from "@/utils/format";

const liters = (attempts: number) => beerLitersForAttempts(attempts).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " L";
const time = (hundredths: number | null) => hundredths == null ? "—" : formatTime(hundredths / 100);
const categories = ["Bester Bier-Durchschnitt", "Schnellste Einzelversuche", "Meiste Liter", "Größter Bier-Effekt", "Sortenvielfalt"] as const;
type Category = typeof categories[number];

function PlayerEffects({ title, rows }: { title: string; rows: BeerFavorite[] }) {
  return <div className="panel min-w-0 p-4"><h3 className="display-title text-xl">{title}</h3>
    {!rows.length && <p className="mt-3 text-sm text-white/50">Noch kein qualifizierter Eintrag.</p>}
    <ol className="mt-3 space-y-3">{rows.map((p, index) => <li key={p.playerId+":"+p.brand} className="text-sm [overflow-wrap:anywhere]">
      <strong>{index+1}. {p.name}</strong><p>{p.brand} · Ø {time(p.averageHundredths)} · {p.attempts} Versuche</p>
      <p className="text-xs text-white/50">{beerEffectLabel(p.effectHundredths)} · Gesamt-Ø {time(p.overallAverageHundredths)} ({p.overallAttempts})</p>
    </li>)}</ol>
  </div>;
}

export function BeerStatisticsContent({ data }: { data: BeerStatistics }) {
  const [category, setCategory] = useState<Category>("Bester Bier-Durchschnitt");
  const ranking = category === "Bester Bier-Durchschnitt"
    ? data.brands.filter(b => b.qualified).sort((a,b) => (a.performancePosition ?? Infinity)-(b.performancePosition ?? Infinity))
      .map(b => ({ key: b.brand, name: b.brand, value: time(b.averageHundredths), detail: b.performanceAttempts+" Leistungsversuche" }))
    : category === "Meiste Liter"
      ? data.brands.map(b => ({ key: b.brand, name: b.brand, value: liters(b.attempts), detail: b.attempts+" gültige Versuche" }))
      : category === "Schnellste Einzelversuche"
        ? data.fastest.map(a => ({ key: a.attemptId, name: a.name, value: time(a.timeHundredths), detail: a.brand+" · "+a.eventName+" · "+a.eventDate }))
        : category === "Größter Bier-Effekt"
          ? data.effects.map(p => ({ key: p.playerId, name: p.name, value: beerEffectLabel(p.effectHundredths), detail: p.brand+" · "+p.attempts+" Versuche" }))
          : data.variety.map(p => ({ key: p.playerId, name: p.name, value: p.brands+" Sorten", detail: p.attempts+" dokumentierte Versuche" }));
  return <div className="min-w-0 space-y-8" data-beer-statistics>
    <section className="panel min-w-0 p-4 sm:p-5" aria-label="Bier-Rekordbuch">
      <h2 className="display-title text-2xl">Bier-Rekordbuch</h2>
      <label className="mt-4 block text-xs text-white/60">Rankingkategorie
        <select className="mt-2 block w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
          value={category} onChange={event => setCategory(event.target.value as Category)}>
          {categories.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <p className="mt-3 text-xs text-white/45">Menge inklusive Gästen und AK, ohne DNF. Leistung nur reguläre Spieler. Mindestens 2 Versuche für Durchschnittswertungen; Einzelrekorde ab 1.</p>
      {!ranking.length && <p className="mt-4 text-sm text-white/50">Noch kein qualifizierter Eintrag.</p>}
      <ol className="mt-4 space-y-2">{ranking.slice(0,10).map((row,index) => <li key={row.key}
        className={"flex min-w-0 gap-3 rounded-xl border p-3 "+(index===0 ? "border-gold-400/30 bg-gold-400/10" : "border-white/5 bg-white/[0.02]")}>
        <span className="shrink-0 text-gold-200">{index+1}.</span>
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]"><strong>{row.name}</strong>
          <p className="text-xs text-white/50">{row.detail}</p><p className="mt-1 text-sm tabular-nums text-gold-200">{row.value}</p>
        </div>
      </li>)}</ol>
    </section>
    <section className="min-w-0" aria-label="Bierregal">
      <h2 className="display-title text-2xl">Bierregal</h2>
      <p className="mt-2 text-xs text-white/45">Nach dokumentierten Litern · Karte öffnen für Spieler und Events.</p>
      <div className="mt-4 grid min-w-0 items-start gap-3 md:grid-cols-2">
        {data.brands.map(beer => <details key={beer.brand} className="group panel min-w-0 overflow-hidden">
          <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400 [&::-webkit-details-marker]:hidden">
            <BeerBottle path={beer.imagePath} />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <strong className="block">{beer.brand}</strong><span className="block text-sm text-gold-200">{liters(beer.attempts)}</span>
              <span className="block text-xs text-white/60">Ø {time(beer.averageHundredths)} · Best {time(beer.bestHundredths)}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="min-w-0 space-y-3 border-t border-white/10 p-4 text-sm [overflow-wrap:anywhere]">
            <p>{liters(beer.attempts)} · {beer.attempts} Versuche · {beer.events} Events · {beer.people} dokumentierte Personen</p>
            <p>Regulärer Ø {time(beer.averageHundredths)} · Reguläre Bestzeit {time(beer.bestHundredths)}</p>
            <p className="text-xs text-white/50">{beer.qualified ? `Leistungsplatz ${beer.performancePosition} · ${beer.performanceAttempts} Leistungsversuche`
              : `Noch nicht qualifiziert · ${beer.performanceAttempts}/2 Leistungsversuche`}</p>
            <p>Meiste getrunken: {beer.mostDrinker.name}{beer.mostDrinker.isGuest ? " (Gast)" : beer.mostDrinker.isAk ? " (AK)" : ""} · {liters(beer.mostDrinker.attempts)}</p>
            <p>Bester Spieler: {beer.bestPlayer ? `${beer.bestPlayer.name} · Ø ${time(beer.bestPlayer.averageHundredths)} · ${beer.bestPlayer.attempts} Versuche` : "Noch niemand mit 2 Leistungsversuchen"}</p>
            <h3 className="font-semibold">Spieler mit diesem Bier</h3>
            <ol className="space-y-3">{beer.players.map(p => <li key={p.playerId}>
              <Link to={"/players/"+p.playerId} className="text-gold-200 underline">{p.name}</Link>
              <p>Ø {time(p.averageHundredths)} · Best {time(p.bestHundredths)} · {p.attempts} Versuche{p.attempts<2 ? " · Rohwert, nicht qualifiziert" : ""}</p>
              <p className="text-xs text-white/50">{beerEffectLabel(p.effectHundredths)}</p>
            </li>)}</ol>
            <h3 className="font-semibold">Events</h3>
            <ul className="space-y-2">{beer.eventDetails.map(e => <li key={e.eventId}>
              <Link to={"/events/"+e.eventId} className="text-gold-200 underline">{e.name}</Link> · {e.date} · {e.attempts} Versuche
            </li>)}</ul>
          </div>
        </details>)}
      </div>
    </section>
    <section className="min-w-0" aria-label="Spieler und Bier">
      <h2 className="display-title text-2xl">Spieler & Bier</h2>
      <p className="mt-2 text-xs leading-5 text-white/45">Lieblingsbier = niedrigster qualifizierter Ø. Gesamt-Ø enthält alle gültigen regulären Eventversuche im Zeitraum, auch ohne Bierangabe. Beschreibender Vergleich, kein Nachweis einer Wirkung.</p>
      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        <PlayerEffects title="Lieblingsbier" rows={data.favorites} />
        <PlayerEffects title="Bier-Turbo" rows={data.effects} />
        <PlayerEffects title="Bier-Pechvogel" rows={data.unlucky} />
        <div className="panel min-w-0 p-4"><h3 className="display-title text-xl">Bier-Sommelier</h3>
          {!data.variety.length && <p className="mt-3 text-sm text-white/50">Noch keine dokumentierten Sorten regulärer Spieler.</p>}
          <ol className="mt-3 space-y-3">{data.variety.map((p,index) => <li key={p.playerId} className="[overflow-wrap:anywhere]">
            <strong>{index+1}. {p.name}</strong><p className="text-sm">{p.brands} Sorten · {p.attempts} dokumentierte Versuche</p>
          </li>)}</ol>
        </div>
      </div>
    </section>
  </div>;
}
