import { useEffect, useState } from "react";
import { getEventFirstAttemptBenchmarks } from "@/services/advancedHallOfFameService";

/** Optional event-wide read; never part of the attempt-save transaction. */
export function useFirstAttemptBenchmarks(eventId: string, refreshVersion: number) {
  const [snapshot, setSnapshot] = useState<{
    eventId: string;
    values: Map<string, number>;
  }>({ eventId: "", values: new Map() });

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    void getEventFirstAttemptBenchmarks(eventId).then((values) => {
      if (active) setSnapshot({ eventId, values });
    }).catch(() => {
      if (active) setSnapshot({ eventId, values: new Map() });
    });
    return () => { active = false; };
  }, [eventId, refreshVersion]);

  return snapshot.eventId === eventId ? snapshot.values : new Map<string, number>();
}
