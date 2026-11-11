import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { ALL_TIME_SEASON } from "@/lib/season";
import type { PerformanceMedals, MedalColor } from "@/lib/performanceMedals";
import { formatMetricValue } from "@/utils/statMetricFormat";
import { medalThresholdMetricKey } from "@/constants/performanceMedalEligibility";
import { timeThresholds } from "@/constants/performanceSections";

const colors: { key: MedalColor; label: string; style: string }[] = [
  {key:"gold",label:"Gold",style:"text-gold-200"}, {key:"silver",label:"Silber",style:"text-slate-200"}, {key:"bronze",label:"Bronze",style:"text-amber-600"},
];
export function PerformanceMedalTable({ result, onRetry }: { result: PerformanceMedals; onRetry: () => void }) {
  const allTime = result.scope === ALL_TIME_SEASON;
  const exclusions = result.notes.filter(n => n.reason !== "empty");
  const threshold = timeThresholds.find(t => t.key === medalThresholdMetricKey)?.label;
  return <section className="panel min-w-0 overflow-hidden p-3 sm:p-6" aria-labelledby="statistics-medals-title">
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gold-300/70">Live-Auswertung</p>
      <h2 id="statistics-medals-title" className="mt-1 font-display text-xl font-black sm:text-2xl">Statistik-Medaillenspiegel</h2>
      <p className="mt-1 text-sm text-white/65">{allTime ? "Ewiger Statistikvergleich · Alle offiziellen Zeiten" : `Saison ${result.scope} · Aktuelle Statistikplatzierungen`}</p>
      <p className="mt-2 text-xs text-gold-200/75">Live-Auswertung · Noch keine endgültig vergebenen Saisonmedaillen</p>
      {allTime && <p className="mt-1 text-xs text-white/45">Der All-Time-Spiegel vergleicht alle Spieler anhand ihrer aktuellen All-Time-Statistikwerte. Er ist keine Summe endgültiger Karriere-Medaillen.</p>}
    </div>
    <details className="mb-4 text-xs text-white/55">
      <summary className="cursor-pointer rounded py-2 font-bold text-gold-200 focus-visible:outline focus-visible:outline-gold-300">Wie werden die Medaillen verteilt?</summary>
      <p className="mt-1 leading-5">Gleiche Statistikränge erhalten dieselbe Medaille: Platz 1 Gold, 2 Silber, 3 Bronze. Bei mehr als fünf Podiumsteilnehmern entfällt die gesamte Kategorie. Zeitgrenzen-Medaille: Unter {threshold} Sekunden. Die Auswahl in der Statistik-Karte ändert diese Wertung nicht. Negativ- und Spaßstatistiken zählen derzeit ebenfalls. Live bedeutet den aktuell verfügbaren offiziellen Stand; einige Werte ändern sich erst nach Eventabschluss.</p>
    </details>
    {result.status !== "ready" ? <div role={result.status === "error" ? "alert" : "status"} className="rounded-xl bg-white/5 p-4 text-sm text-white/60">
      <p>{result.status === "error" ? "Medaillenspiegel unvollständig: Eine Datenquelle konnte nicht geladen werden." : "Medaillenspiegel wird vervollständigt …"}</p>
      <p className="mt-1 text-xs">Noch offen: {result.pending.join(", ")}. Bis dahin wird keine Teilwertung angezeigt.</p>
      {result.status === "error" && <Button type="button" variant="outline" className="mt-3" onClick={onRetry}>Medaillendaten erneut laden</Button>}
    </div> : <>
      <p className="mb-3 text-xs text-white/45">{result.evaluatedCategories} Kategorien gewertet · {result.notes.filter(n => n.reason === "empty").length} ohne qualifiziertes Podium</p>
      <div className="mb-1 grid grid-cols-[1.5rem_minmax(0,1fr)_6.75rem] items-center gap-2 px-2 text-[10px] font-bold uppercase text-white/45 sm:grid-cols-[2rem_minmax(0,1fr)_9rem]">
        <span>Rang</span><span>Spieler</span><div className="grid grid-cols-3 text-center">{colors.map(c => <span key={c.key} className={c.style}>{c.label}</span>)}</div>
      </div>
      <ol className="space-y-2" aria-label="Statistik-Medaillenrangliste">
        {result.rows.map(row => <li key={row.playerId} className={`min-w-0 rounded-xl border p-2 ${row.rank <= 3 && row.total > 0 ? "border-gold-300/20 bg-gold-300/5" : "border-white/5 bg-white/[0.02]"}`}>
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_6.75rem] items-center gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_9rem]">
            <span className="font-display font-black tabular-nums text-gold-200">{row.rank}.</span>
            <div className="flex min-w-0 items-center gap-2"><ProfileAvatar id={row.playerId} name={row.name} url={row.avatarUrl} className="size-7 shrink-0 sm:size-9" /><a className="min-w-0 truncate text-xs font-bold hover:text-gold-200 focus-visible:outline focus-visible:outline-gold-300 sm:text-sm" href={`/player/${row.playerId}`}>{row.name}</a></div>
            <div className="grid grid-cols-3 text-center font-display font-black tabular-nums">{colors.map(c => <span key={c.key} className={c.style} aria-label={`${row[c.key]} ${c.label}`}>{row[c.key]}</span>)}</div>
          </div>
          <details className="mt-1 min-w-0 text-xs text-white/60 [overflow-wrap:anywhere]">
            <summary className="cursor-pointer rounded py-2 text-gold-200/80 focus-visible:outline focus-visible:outline-gold-300">{row.total} Medaillen · Details für {row.name}</summary>
            {row.total === 0 ? <p className="pb-2">Aktuell keine Statistikmedaillen.</p> : colors.map(c => {
              const medals = row.medals.filter(m => m.color === c.key);
              return medals.length > 0 && <div key={c.key} className="mb-3 rounded-lg bg-black/15 p-2"><h3 className={`mb-1 font-bold ${c.style}`}>{c.label}</h3><ul className="space-y-2">{medals.map(m => <li key={m.key}>
                <a href={`#${m.sectionId}`} className="font-bold text-white/80 underline">{m.title}</a> · {formatMetricValue(m.value,m.format)} · Platz {m.statisticRank}
                <p className="text-[10px] text-white/40">{m.section}{m.total != null ? ` · Stichprobe ${m.total}` : m.count != null ? ` · Anzahl ${m.count}` : ""}</p>
              </li>)}</ul></div>;
            })}
          </details>
        </li>)}
      </ol>
      {result.rows.length === 0 && <p className="py-4 text-sm text-white/45">Keine aktiven regulären Spieler verfügbar.</p>}
      {exclusions.length > 0 && <details className="mt-4 text-xs text-white/55"><summary className="cursor-pointer rounded py-2 font-bold text-gold-200 focus-visible:outline focus-visible:outline-gold-300">Kategorien ohne Medaillenvergabe ({exclusions.length})</summary><ul className="mt-2 space-y-2">{exclusions.map(n => <li key={n.key}>{n.title} – {n.reason === "too-many" ? `${n.recipients} Spieler auf den Podiumsplätzen im gelieferten Ranking. Deshalb keine Medaillen vergeben.` : n.reason === "disabled" ? "Für diese Vorschau deaktiviert." : "Nicht sicher auswertbar; keine Medaillen vergeben."}</li>)}</ul></details>}
    </>}
  </section>;
}
