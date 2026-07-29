import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { reconcileDataPlatformSnapshot } from "@/lib/dataPlatformReconciliation";
import { isSupabaseConfigured } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import { createRefreshCoordinator } from "@/lib/refreshCoordinator";
import {
  emptyMigrationResult,
  migrateLocalStateToSupabase,
  readLocalMigrationSource,
} from "@/lib/localDataMigration";
import type { LocalMigrationResult } from "@/lib/localDataMigration";
import {
  closeExpiredRemoteEvents,
  loadDataPlatform,
  subscribeToDataPlatform,
} from "@/services/dataPlatformRepository";
import type { DataPlatformSnapshot } from "@/services/dataPlatformRepository";
import { emptyPublicData } from "@/services/publicDataService";

export type DataStatus = "loading" | "ready" | "error" | "unconfigured";
export type RealtimeStatus = "connecting" | "connected" | "disconnected";

const emptySnapshot: DataPlatformSnapshot = {
  publicData: emptyPublicData,
  liveState: { version: 2, players: [], events: [], attempts: [], historicalAttempts: [] },
};

interface DataPlatformContextValue {
  snapshot: DataPlatformSnapshot;
  status: DataStatus;
  realtimeStatus: RealtimeStatus;
  error: string | null;
  migration: LocalMigrationResult;
  migrationError: string | null;
  refresh: () => Promise<void>;
}

const DataPlatformContext = createContext<DataPlatformContextValue | null>(null);

export function DataPlatformProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [status, setStatus] = useState<DataStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [migration, setMigration] = useState(emptyMigrationResult("none"));
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const refetchTimer = useRef<number | null>(null);

  const loadLatestSnapshot = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }
    try {
      const loaded = await loadDataPlatform();
      setSnapshot((previous) => reconcileDataPlatformSnapshot(previous, loaded));
      setError(null);
      setStatus("ready");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setStatus("error");
      throw loadError;
    }
  }, []);
  const refreshCoordinator = useRef(createRefreshCoordinator(loadLatestSnapshot));
  const refresh = useCallback(
    () => refreshCoordinator.current(),
    [],
  );

  const scheduleRefresh = useCallback(() => {
    if (refetchTimer.current != null) window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(() => {
      refetchTimer.current = null;
      void refresh().catch(() => undefined);
    }, 120);
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const initialize = async () => {
      try {
        await closeExpiredRemoteEvents();
        await refresh();
        const source = readLocalMigrationSource();
        if (!active) return;
        setMigration(source.result);
        if (source.key && source.state) {
          const result = await migrateLocalStateToSupabase(source.state, source.key);
          if (!active) return;
          setMigration(result);
          await closeExpiredRemoteEvents();
          await refresh();
        } else if (source.result.status === "invalid") {
          setMigrationError(
            "Lokale PR-5-Daten konnten nicht sicher gelesen werden und wurden nicht gelöscht.",
          );
        }
      } catch (loadError) {
        if (active) setMigrationError(getErrorMessage(loadError));
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const unsubscribe = subscribeToDataPlatform(scheduleRefresh, (channelStatus) => {
      setRealtimeStatus(channelStatus === "SUBSCRIBED"
        ? "connected"
        : channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT" ||
          channelStatus === "CLOSED"
          ? "disconnected"
          : "connecting");
    });
    return () => {
      unsubscribe();
      if (refetchTimer.current != null) window.clearTimeout(refetchTimer.current);
    };
  }, [scheduleRefresh]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const refetchVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", refetchVisible);
    return () => {
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", refetchVisible);
    };
  }, [scheduleRefresh]);

  const hasActiveEvent = snapshot.liveState.events.some(({ status: value }) => value === "active");
  useEffect(() => {
    if (!hasActiveEvent || !isSupabaseConfigured) return;
    const interval = window.setInterval(() => {
      void closeExpiredRemoteEvents()
        .then(scheduleRefresh)
        .catch(() => setRealtimeStatus("disconnected"));
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [hasActiveEvent, scheduleRefresh]);

  const value = useMemo(() => ({
    snapshot,
    status,
    realtimeStatus,
    error,
    migration,
    migrationError,
    refresh,
  }), [error, migration, migrationError, realtimeStatus, refresh, snapshot, status]);
  return <DataPlatformContext.Provider value={value}>{children}</DataPlatformContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataPlatform() {
  const context = useContext(DataPlatformContext);
  if (!context) throw new Error("useDataPlatform muss innerhalb des Providers verwendet werden.");
  return context;
}
