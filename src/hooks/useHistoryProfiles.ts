import { useEffect, useState } from "react";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { getErrorMessage } from "@/lib/errors";
import {
  getEventDetail,
  getPlayerProfileDetail,
} from "@/services/historyProfileService";
import type { EventDetail, PlayerProfileDetail } from "@/types/historyProfiles";

interface DetailState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

const initialState = <T,>(): DetailState<T> => ({ data: null, loading: true, error: "" });

export function useEventDetail(eventId: string) {
  const { snapshot, status } = useDataPlatform();
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
  }, [eventId, snapshot, status]);
  return state;
}

export function usePlayerProfileDetail(playerId: string) {
  const { snapshot, status } = useDataPlatform();
  const [state, setState] = useState<DetailState<PlayerProfileDetail>>(initialState);
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
  }, [playerId, snapshot, status]);
  return state;
}
