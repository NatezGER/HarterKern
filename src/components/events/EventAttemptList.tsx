import { useMemo, useState } from "react";
import { CircleX, Medal, Timer } from "lucide-react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { formatTime } from "@/utils/format";
import type { EventAttemptDetail } from "@/types/historyProfiles";
import { sortEventAttempts } from "@/lib/historyProfiles";

type SortMode = "chronological" | "best";

export function EventAttemptList({ attempts }: { attempts: EventAttemptDetail[] }) {
  const [sort, setSort] = useState<SortMode>("chronological");
  const [participant, setParticipant] = useState("all");
  const participants = useMemo(() => Array.from(new Map(attempts.map((attempt) => [
    attempt.playerId ?? attempt.guestId ?? attempt.name,
    { id: attempt.playerId ?? attempt.guestId ?? attempt.name, name: attempt.name },
  ])).values()), [attempts]);
  const visible = useMemo(() => sortEventAttempts(attempts
    .filter((attempt) => participant === "all" || (attempt.playerId ?? attempt.guestId ?? attempt.name) === participant), sort), [attempts, participant, sort]);
  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="display-title text-3xl">Alle Versuche</h2>
        <div className="grid grid-cols-2 gap-2">
          <select value={participant} onChange={(event) => setParticipant(event.target.value)} aria-label="Teilnehmer filtern" className="h-11 rounded-xl border border-white/10 bg-[#111312] px-3 text-xs"><option value="all">Alle Teilnehmer</option>{participants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Versuche sortieren" className="h-11 rounded-xl border border-white/10 bg-[#111312] px-3 text-xs"><option value="chronological">Chronologisch</option><option value="best">Beste Zeit</option></select>
        </div>
      </div>
      <div className="panel overflow-hidden">
        {visible.length === 0 && <p className="py-14 text-center text-sm text-white/40">Keine Versuche für diesen Filter.</p>}
        {visible.map((attempt) => <article key={attempt.id} className="flex items-center gap-3 border-b border-white/[0.06] p-4 last:border-0 sm:px-6"><ProfileAvatar id={attempt.playerId ?? attempt.guestId ?? attempt.name} name={attempt.name} url={attempt.avatarUrl} className="size-10" /><div className="min-w-0 flex-1"><p className="truncate font-bold">{attempt.name}</p><p className="text-[10px] text-white/35">Versuch {attempt.attemptNumber} · {new Date(attempt.submittedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="hidden flex-wrap justify-end gap-1.5 sm:flex">{attempt.isPb && <Mark label="PB" />}{attempt.isWr && <Mark label="WR" gold />}{attempt.isEb && <Mark label="EB" />}</div><p className={`flex min-w-20 items-center justify-end gap-2 font-display text-xl font-black ${attempt.isDnf ? "text-red-300" : ""}`}>{attempt.isDnf ? <><CircleX className="size-4" /> DNF</> : <><Timer className="size-4 text-white/25" />{formatTime((attempt.timeHundredths ?? 0) / 100)}</>}</p><div className="flex gap-1 sm:hidden">{(attempt.isPb || attempt.isWr || attempt.isEb) && <Medal className="size-4 text-gold-400" aria-label="Leistungsmarkierung" />}</div></article>)}
      </div>
    </section>
  );
}

function Mark({ label, gold = false }: { label: string; gold?: boolean }) {
  return <span className={`rounded-full px-2 py-1 text-[9px] font-black ${gold ? "bg-gold-400/15 text-gold-300" : "bg-emerald-400/10 text-emerald-300"}`}>{label}</span>;
}
