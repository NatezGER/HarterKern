import { useEffect, useState } from "react";
import { getEventSweetSpots, type SweetSpot } from "@/services/sweetSpotService";

/** Optional event-wide read, refreshed by the existing live data-group version. */
export function useSweetSpots(eventId: string, refreshVersion: number) {
  const [snapshot, setSnapshot] = useState<{
    eventId: string; version: number; values: Map<string, SweetSpot>;
  }>({ eventId: "", version: -1, values: new Map() });

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    void getEventSweetSpots(eventId).then(values => {
      if (active) setSnapshot({ eventId, version: refreshVersion, values });
    }).catch(() => {
      if (active) setSnapshot({ eventId, version: refreshVersion, values: new Map() });
    });
    return () => { active = false; };
  }, [eventId, refreshVersion]);

  // Hide stale event/version results synchronously, including after update/delete.
  return snapshot.eventId === eventId && snapshot.version === refreshVersion
    ? snapshot.values : new Map<string, SweetSpot>();
}
