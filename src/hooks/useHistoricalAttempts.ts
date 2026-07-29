import { useCallback, useState } from "react";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { getErrorMessage } from "@/lib/errors";
import {
  createHistoricalAttempt,
  deleteHistoricalAttempt,
  updateHistoricalAttempt,
} from "@/services/historicalAttemptRepository";
import type { HistoricalAttemptInput } from "@/types/liveEvent";

export function useHistoricalAttempts() {
  const { snapshot, refresh } = useDataPlatform();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    try {
      setError(null);
      await action();
      await refresh();
      return true;
    } catch (caught) {
      setError(getErrorMessage(caught));
      return false;
    }
  }, [refresh]);

  return {
    attempts: snapshot.liveState.historicalAttempts,
    players: snapshot.liveState.players,
    error,
    createHistorical: (input: HistoricalAttemptInput) =>
      run(() => createHistoricalAttempt(input)),
    updateHistorical: (id: string, input: HistoricalAttemptInput) =>
      run(() => updateHistoricalAttempt(id, input)),
    deleteHistorical: (id: string) =>
      run(() => deleteHistoricalAttempt(id)),
  };
}
