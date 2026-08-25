import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { visibleAttemptNumbers } from "@/lib/playerCompareDeep";
import type { CompareAttemptNumberPoint } from "@/types/playerCompare";
import { formatTime } from "@/utils/format";

export function CompareAttemptNumberChart({
  playerAName,
  playerBName,
  playerA,
  playerB,
}: {
  playerAName: string;
  playerBName: string;
  playerA: CompareAttemptNumberPoint[];
  playerB: CompareAttemptNumberPoint[];
}) {
  const [expanded, setExpanded] = useState(false);
  const playerAByNumber = new Map(playerA.map((point) => [point.attemptNumber, point]));
  const playerBByNumber = new Map(playerB.map((point) => [point.attemptNumber, point]));
  const numbers = [...new Set([...playerAByNumber.keys(), ...playerBByNumber.keys()])]
    .sort((left, right) => left - right);
  const visible = visibleAttemptNumbers(numbers, expanded);
  const averages = visible.flatMap((number) => [
    playerAByNumber.get(number)?.averageHundredths,
    playerBByNumber.get(number)?.averageHundredths,
  ]).filter((value): value is number => value != null);
  if (!numbers.length || !averages.length) {
    return <p className="py-12 text-center text-sm text-white/40">Noch nicht genug gültige Eventversuche.</p>;
  }
  const fastest = Math.min(...averages);
  const slowest = Math.max(...averages);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
        <span>Höherer Balken = schnellerer Ø</span>
        <span className="flex items-center gap-3"><i className="size-2.5 rounded-sm bg-gold-300" />{playerAName}<i className="ml-1 size-2.5 rounded-sm bg-cyan-300" />{playerBName}</span>
      </div>
      <div data-attempt-number-chart className="grid grid-cols-5 gap-2 sm:gap-3">
        {visible.map((attemptNumber) => (
          <AttemptGroup
            key={attemptNumber}
            attemptNumber={attemptNumber}
            playerAName={playerAName}
            playerBName={playerBName}
            playerA={playerAByNumber.get(attemptNumber)}
            playerB={playerBByNumber.get(attemptNumber)}
            fastest={fastest}
            slowest={slowest}
          />
        ))}
      </div>
      {numbers.length > 5 && (
        <div className="mt-5 text-center">
          <Button type="button" variant="outline" size="sm" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? "Auf fünf Versuche reduzieren" : "Weitere Versuche anzeigen"}
          </Button>
        </div>
      )}
    </div>
  );
}

function AttemptGroup({
  attemptNumber,
  playerAName,
  playerBName,
  playerA,
  playerB,
  fastest,
  slowest,
}: {
  attemptNumber: number;
  playerAName: string;
  playerBName: string;
  playerA?: CompareAttemptNumberPoint;
  playerB?: CompareAttemptNumberPoint;
  fastest: number;
  slowest: number;
}) {
  return (
    <div className="flex h-52 min-w-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-2 items-end gap-1 rounded-xl bg-black/15 px-1 pt-7">
        <AttemptBar point={playerA} playerName={playerAName} series="player-a" className="from-gold-600/60 to-gold-300" fastest={fastest} slowest={slowest} />
        <AttemptBar point={playerB} playerName={playerBName} series="player-b" className="from-cyan-800/70 to-cyan-300" fastest={fastest} slowest={slowest} />
      </div>
      <p className="mt-2 text-center text-[9px] font-black uppercase tracking-wide text-white/40 sm:text-[10px]">Versuch {attemptNumber}</p>
    </div>
  );
}

function AttemptBar({
  point,
  playerName,
  series,
  className,
  fastest,
  slowest,
}: {
  point?: CompareAttemptNumberPoint;
  playerName: string;
  series: "player-a" | "player-b";
  className: string;
  fastest: number;
  slowest: number;
}) {
  const height = point?.averageHundredths == null
    ? 8
    : slowest === fastest ? 82 : 35 + ((slowest - point.averageHundredths) / (slowest - fastest)) * 65;
  const description = point?.averageHundredths == null
    ? `${playerName}: kein gültiger Durchschnitt`
    : `${playerName}, Versuch ${point.attemptNumber}: ${formatTime(point.averageHundredths / 100)}, ${point.validAttempts} gültige von ${point.samples} Versuchen`;
  return (
    <button type="button" title={description} aria-label={description} data-attempt-series={series} className="group relative flex h-full w-full min-w-0 items-end focus-visible:outline-none">
      <span className="pointer-events-none invisible absolute bottom-[calc(100%+0.35rem)] left-1/2 z-20 w-max max-w-36 -translate-x-1/2 rounded-lg border border-white/10 bg-[#11130f] px-2 py-1 text-center text-[9px] normal-case tracking-normal text-white/75 shadow-xl group-hover:visible group-focus-visible:visible">{description}</span>
      <span className={`w-full rounded-t-md bg-gradient-to-t ${className} ${point?.averageHundredths == null ? "opacity-20" : ""}`} style={{ height: `${height}%` }} />
    </button>
  );
}
