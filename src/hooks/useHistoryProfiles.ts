import { useCallback, useEffect, useState } from "react";
import { useDataGroup, useDataPlatform } from "@/hooks/useDataPlatform";
import { getErrorMessage } from "@/lib/errors";
import {
  getEventDetail,
  getPlayerBingo,
  getPlayerProfileDetail,
} from "@/services/historyProfileService";
import type { EventDetail, PlayerBingo, PlayerProfileDetail } from "@/types/historyProfiles";

interface DetailState<T> {
  data: T | null;
  loading: boolean;
  error: string;
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
      .then((data) => active && setState({ data, loading: false, error: "" }))
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

export function usePlayerProfileDetail(playerId: string) {
  const { status } = useDataPlatform();
  const { version } = useDataGroup("player-profile");
  const [state, setState] = useState<DetailState<PlayerProfileDetail>>(initialState);
  const [bingo, setBingo] = useState<DetailState<PlayerBingo>>(initialState);
  const [bingoRun, setBingoRun] = useState(0);
  const retryBingo = useCallback(() => setBingoRun((current) => current + 1), []);
  useEffect(() => {
    if (status !== "ready") {
      setState(initialState);
      return;
    }
    let active = true;
    setState(initialState);
    void getPlayerProfileDetail(playerId)
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch((error) => active && setState({
        data: null,
        loading: false,
        error: getErrorMessage(error),
      }));
    return () => {
      active = false;
    };
  }, [playerId, status, version]);
  useEffect(() => {
    if (status !== "ready") {
      setBingo(initialState);
      return;
    }
    let active = true;
    setBingo(initialState);
    void getPlayerBingo(playerId)
      .then((data) => active && setBingo({ data, loading: false, error: "" }))
      .catch((error) => active && setBingo({
        data: null,
        loading: false,
        error: getErrorMessage(error),
      }));
    return () => { active = false; };
  }, [bingoRun, playerId, status, version]);
  return { ...state, bingo: { ...bingo, retry: retryBingo } };
}
