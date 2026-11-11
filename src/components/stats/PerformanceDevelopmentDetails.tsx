import type { DevelopmentEvidence, DevelopmentSource } from "@/types/performanceDevelopment";
import { formatMetricValue } from "@/utils/statMetricFormat";
const time = (v: number) => formatMetricValue(v, "precise-time");
function Source({ value }: { value: DevelopmentSource }) {
  return <span>{value.date} · {time(value.time)} · {value.eventId ? <a className="text-gold-200 underline" href={`/events/${value.eventId}`}>Event</a> : "Historische Quelle"}{!value.exact && " (nur Datum; Importreihenfolge)"}</span>;
}
function Window({ title, values }: { title: string; values: DevelopmentSource[] }) {
  return <div><p className="font-bold">{title}: {values[0].date}–{values.at(-1)!.date}</p><ol className="mt-1 space-y-1">{values.map(v => <li key={v.id}><Source value={v} /></li>)}</ol></div>;
}
export function PerformanceDevelopmentDetails({ evidence: e, embedded = false }: { evidence?: DevelopmentEvidence; embedded?: boolean }) {
  if (!e) return null;
  const Wrapper = embedded ? "div" : "details";
  return <Wrapper className="mt-2 min-w-0 border-t border-white/10 pt-2 text-xs text-white/65 [overflow-wrap:anywhere]">
    {!embedded && <summary className="cursor-pointer rounded py-1 font-bold text-gold-200 focus-visible:outline focus-visible:outline-gold-300">Details ansehen</summary>}
    <div className="mt-2 space-y-2">
      {e.kind === "spiral" && <><p><a href={`/events/${e.eventId}`} className="text-gold-200 underline">{e.eventName}</a> · {e.eventDate}</p><p>{e.length} Übergänge · Versuche {e.start}–{e.end} · Zeitänderung {time(Math.abs(e.attempts.at(-1)!.time - e.attempts[0].time))}</p><ol className="flex flex-wrap gap-2">{e.attempts.map(a => <li key={a.id} className="rounded bg-white/5 px-2 py-1">#{a.number}: {time(a.time)}</li>)}</ol></>}
      {e.kind === "trend" && <><p>{e.samples} gültige Zeiten · Median alt {time(e.olderMedian)} · Median neu {time(e.newerMedian)} · Unterschied {time(Math.abs(e.olderMedian - e.newerMedian))}</p><Window title="Ältere fünf" values={e.older} /><Window title="Jüngere fünf" values={e.newer} /></>}
      {e.kind === "hunt" && <><p>Abgeschlossene Rekordjagd: {e.length} gültige Versuche, davon {e.intermediate} Zwischenversuche.</p><p>Ausgangs-PB: <Source value={e.before} /></p><p>Neue PB (mitgezählt): <Source value={e.after} /></p></>}
      {e.kind === "plateau" && <><p>{e.season === null ? "Noch laufend · All-Time" : `Stand am Saisonende ${e.season} · nur Versuche dieser Saison`}: {e.length} gültige Versuche.</p><p>Letzte strikte PB: <Source value={e.pb} /></p><p>Erster gezählter Versuch: <Source value={e.first} /></p><p>Letzter relevanter Versuch: <Source value={e.last} /></p></>}
      {e.kind === "near" && <><p>{e.total} Treffer · {e.hits.length} jüngste Belege{e.total > e.hits.length && ` (auf ${e.limit} begrenzt)`}</p><ol className="space-y-2">{e.hits.map(h => <li key={h.id}><Source value={h} /> · damalige PB {time(h.priorPb)} · Abstand +{time(h.gap)}</li>)}</ol></>}
      {e.kind === "consistent" && <><p>{e.samples} gültige Zeiten · Durchschnitt {time(e.mean)}</p><p>CV {e.cv.toLocaleString("de-DE", { maximumFractionDigits: 2 })} % ≤ Grenze {e.cutoff.toLocaleString("de-DE", { maximumFractionDigits: 2 })} %</p><p>{e.population} Spieler mit mindestens zehn Zeiten · Drittel aufgerundet: {e.target} · einschließlich Grenzgleichständen: {e.qualified} qualifiziert.</p><p>Der CV erfüllt die Grenze; die Platzierung entscheidet der ungerundete Durchschnitt.</p></>}
    </div>
  </Wrapper>;
}
