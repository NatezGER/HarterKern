import type { EventLeadPlayerStatistic } from "@/types";

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} Min.`;
  return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
}

export function EventLeadStatistics({ data }: { data: EventLeadPlayerStatistic[] }) {
  if (!data.length) {
    return <p className="panel p-5 text-sm text-white/45">Noch keine qualifizierten Event-Führungszeiten.</p>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-white/[0.04] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <span>Spieler</span><span>Führungszeit</span><span>Bestzeiten gebrochen</span>
        <span className="hidden sm:block">Übernommen</span>
      </div>
      {data.map((row) => (
        <div key={row.playerId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-white/[0.06] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <span className="truncate text-sm font-semibold">{row.playerName}</span>
          <strong className="text-sm tabular-nums text-gold-200">{formatDuration(row.totalLeadSeconds)}</strong>
          <span className="text-center text-sm tabular-nums">{row.eventBestBreaks}</span>
          <span className="hidden text-center text-sm tabular-nums sm:block">{row.leadTakeovers}</span>
        </div>
      ))}
    </div>
  );
}
