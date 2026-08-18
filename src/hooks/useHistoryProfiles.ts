import { useCallback, useEffect, useState } from "react";
import { useDataGroup, useDataPlatform } from "@/hooks/useDataPlatform";
import { getErrorMessage } from "@/lib/errors";
import {
  getEventDetail,
  getEventDetailExtras,
} from "@/services/historyProfileService";
import {
  loadPlayerProfileSection,
} from "@/services/playerProfileService";
import type {
  PlayerProfileSection,
  PlayerProfileSectionData,
} from "@/services/playerProfileService";
import type { DataGroup } from "@/services/dataGroupService";
import type { EventDetail } from "@/types/historyProfiles";
import { useSeason } from "@/hooks/useSeason";

interface DetailState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

export interface ProfileSectionState<T> extends DetailState<T> {
  retry: () => void;
}

const initialState = <T,>(): DetailState<T> => ({ data: null, loading: true, error: "" });

export function useEventDetail(eventId: string) {
  const { status } = useDataPlatform();
  const { version } = useDataGroup("event-detail");
  const [state, setState] = useState<DetailState<EventDetail>>(initialState);
  useEffect(() => {
    if (status !== "ready") {
      setState(initialState);
      return;
    }
    let active = true;
    setState(initialState);
    void getEventDetail(eventId)
      .then((data) => {
        if (!active) return;
        setState({ data, loading: false, error: "" });
        if (!data) return;
        void getEventDetailExtras(eventId).then((extras) => {
          if (!active) return;
          setState((current) => current.data
            ? { ...current, data: { ...current.data, ...extras } }
            : current);
        }).catch(() => {
          if (!active) return;
          setState((current) => current.data ? {
            ...current,
            data: {
              ...current.data,
              extras: {
                loading: false,
                errors: {
                  badges: "Badge-Unlocks konnten nicht geladen werden.",
                  photos: "Eventfotos konnten nicht geladen werden.",
                  trophies: "Trophäen konnten nicht geladen werden.",
                },
              },
            },
          } : current);
        });
      })
      .catch((error) => active && setState({
        data: null,
        loading: false,
        error: getErrorMessage(error),
      }));
    return () => {
      active = false;
    };
  }, [eventId, status, version]);
  return state;
}

function usePlayerProfileSection<Section extends PlayerProfileSection>(
  section: Section,
  playerId: string,
  group: DataGroup,
  seasonYear?: number,
): ProfileSectionState<PlayerProfileSectionData[Section]> {
  const { status: platformStatus } = useDataPlatform();
  const { status: groupStatus, version } = useDataGroup(group);
  const requestKey = `${section}:${playerId}:${seasonYear ?? "all-time"}`;
  const [state, setState] = useState<DetailState<PlayerProfileSectionData[Section]> & {
    requestKey: string;
  }>(() => ({ ...initialState(), requestKey }));
  const [run, setRun] = useState(0);
  const retry = useCallback(() => setRun((current) => current + 1), []);
  useEffect(() => {
    if (platformStatus !== "ready" || groupStatus !== "ready") {
      setState({ ...initialState(), requestKey });
      return;
    }
    let active = true;
    setState({ ...initialState(), requestKey });
    void loadPlayerProfileSection(section, playerId, { force: run > 0, seasonYear })
      .then((data) => active && setState({ data, loading: false, error: "", requestKey }))
      .catch(() => active && setState({
        data: null,
        loading: false,
        error: section === "core"
          ? "Profil konnte nicht geladen werden."
          : "Dieser Bereich konnte nicht geladen werden.",
        requestKey,
      }));
    return () => {
      active = false;
    };
  }, [groupStatus, platformStatus, playerId, requestKey, run, seasonYear, section, version]);
  const currentState = state.requestKey === requestKey
    ? state
    : initialState<PlayerProfileSectionData[Section]>();
  return { ...currentState, retry };
}

export function usePlayerProfileDetail(playerId: string) {
  const { season } = useSeason();
  const seasonYear = typeof season === "number" ? season : undefined;
  return {
    core: usePlayerProfileSection("core", playerId, "profile-core"),
    season: usePlayerProfileSection("season", playerId, "profile-season", seasonYear),
    trophies: usePlayerProfileSection("trophies", playerId, "profile-trophies"),
    badges: usePlayerProfileSection("badges", playerId, "profile-badges"),
    prestige: usePlayerProfileSection("prestige", playerId, "profile-prestige"),
    progression: usePlayerProfileSection(
      "progression",
      playerId,
      "profile-progression",
      seasonYear,
    ),
    bingo: usePlayerProfileSection("bingo", playerId, "bingo"),
    attemptNumbers: usePlayerProfileSection(
      "attempt-numbers",
      playerId,
      "profile-attempt-numbers",
    ),
    events: usePlayerProfileSection("events", playerId, "profile-events"),
  };
}
