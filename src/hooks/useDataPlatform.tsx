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
import { useLocation } from "react-router-dom";
import { isSupabaseConfigured } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import {
  emptyMigrationResult,
  migrateLocalStateToSupabase,
  readLocalMigrationSource,
} from "@/lib/localDataMigration";
import type { LocalMigrationResult } from "@/lib/localDataMigration";
import {
  closeExpiredRemoteEvents,
  subscribeToDataPlatform,
} from "@/services/dataPlatformRepository";
import type { DataPlatformSnapshot } from "@/services/dataPlatformRepository";
import {
  getRouteDataPlan,
  groupsForRealtimeTable,
  loadDataGroup,
} from "@/services/dataGroupService";
import type { DataGroup, DataGroupPatch, RouteDataPlan } from "@/services/dataGroupService";
import type { LiveEventState } from "@/types/liveEvent";
import { emptyPublicData } from "@/services/publicDataService";

export type DataStatus = "loading" | "ready" | "error" | "unconfigured";
export type RealtimeStatus = "connecting" | "connected" | "disconnected";
export type DataGroupStatus = "idle" | "loading" | "ready" | "error";

interface DataGroupState {
  status: DataGroupStatus;
  error: string | null;
  version: number;
}

const emptyLiveState: LiveEventState = {
  version: 2,
  players: [],
  events: [],
  attempts: [],
  historicalAttempts: [],
};

const emptySnapshot: DataPlatformSnapshot = {
  publicData: emptyPublicData,
  liveState: emptyLiveState,
};

const emptyGroupState = (): DataGroupState => ({ status: "idle", error: null, version: 0 });

interface DataPlatformContextValue {
  snapshot: DataPlatformSnapshot;
  status: DataStatus;
  realtimeStatus: RealtimeStatus;
  error: string | null;
  migration: LocalMigrationResult;
  migrationError: string | null;
  groups: Partial<Record<DataGroup, DataGroupState>>;
  refresh: () => Promise<void>;
  refreshGroup: (group: DataGroup) => Promise<void>;
}

const DataPlatformContext = createContext<DataPlatformContextValue | null>(null);

function mergePatch(snapshot: DataPlatformSnapshot, patch: DataGroupPatch): DataPlatformSnapshot {
  return {
    publicData: patch.publicData
      ? { ...snapshot.publicData, ...patch.publicData }
      : snapshot.publicData,
    liveState: patch.liveState
      ? { ...snapshot.liveState, ...patch.liveState }
      : snapshot.liveState,
  };
}

function allPlanGroups(plan: RouteDataPlan) {
  return [...new Set([...plan.required, ...plan.optional])];
}

export function DataPlatformProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const plan = useMemo(() => getRouteDataPlan(pathname), [pathname]);
  const planRef = useRef(plan);
  planRef.current = plan;
  const routeRun = useRef(0);
  const routeRefresh = useRef<Promise<void> | null>(null);
  const refetchTimer = useRef<number | null>(null);
  const scheduledGroups = useRef(new Set<DataGroup>());
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [status, setStatus] = useState<DataStatus>(isSupabaseConfigured ? "loading" : "unconfigured");
  const [groups, setGroups] = useState<Partial<Record<DataGroup, DataGroupState>>>({});
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [migration, setMigration] = useState(emptyMigrationResult("none"));
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const updateGroup = useCallback((group: DataGroup, update: Partial<DataGroupState>) => {
    setGroups((current) => ({
      ...current,
      [group]: { ...(current[group] ?? emptyGroupState()), ...update },
    }));
  }, []);

  const loadGroup = useCallback(async (group: DataGroup) => {
    updateGroup(group, { status: "loading", error: null });
    try {
      const patch = await loadDataGroup(group);
      setSnapshot((current) => mergePatch(current, patch));
      setGroups((current) => {
        const previous = current[group] ?? emptyGroupState();
        return {
          ...current,
          [group]: { status: "ready", error: null, version: previous.version + 1 },
        };
      });
    } catch (caught) {
      const message = getErrorMessage(caught);
      updateGroup(group, { status: "error", error: message });
      throw caught;
    }
  }, [updateGroup]);

  const loadOptionalGroups = useCallback(async (optional: DataGroup[]) => {
    for (const group of optional) {
      try {
        await loadGroup(group);
      } catch {
        // Optional module errors remain scoped to their section.
      }
    }
  }, [loadGroup]);

  const loadPlan = useCallback(async (nextPlan: RouteDataPlan, runId?: number) => {
    try {
      await Promise.all(nextPlan.required.map(loadGroup));
      if (runId == null || routeRun.current === runId) {
        setStatus("ready");
        setError(null);
      }
      void loadOptionalGroups(nextPlan.optional);
    } catch (caught) {
      if (runId == null || routeRun.current === runId) {
        setStatus("error");
        setError(getErrorMessage(caught));
      }
      throw caught;
    }
  }, [loadGroup, loadOptionalGroups]);

  const refresh = useCallback(() => {
    if (routeRefresh.current) return routeRefresh.current;
    const task = loadPlan(planRef.current).finally(() => {
      if (routeRefresh.current === task) routeRefresh.current = null;
    });
    routeRefresh.current = task;
    return task;
  }, [loadPlan]);

  const refreshGroup = useCallback(async (group: DataGroup) => {
    await loadGroup(group);
  }, [loadGroup]);

  const refreshSelectedGroups = useCallback(async (selected: DataGroup[]) => {
    const currentPlan = planRef.current;
    const required = selected.filter((group) => currentPlan.required.includes(group));
    const optional = selected.filter((group) => currentPlan.optional.includes(group));
    if (required.length) {
      try {
        await Promise.all(required.map(loadGroup));
        setStatus("ready");
        setError(null);
      } catch (caught) {
        setStatus("error");
        setError(getErrorMessage(caught));
      }
    }
    await loadOptionalGroups(optional);
  }, [loadGroup, loadOptionalGroups]);

  const scheduleGroups = useCallback((selected: DataGroup[]) => {
    for (const group of selected) scheduledGroups.current.add(group);
    if (refetchTimer.current != null) window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(() => {
      refetchTimer.current = null;
      const pending = [...scheduledGroups.current];
      scheduledGroups.current.clear();
      void refreshSelectedGroups(pending);
    }, 120);
  }, [refreshSelectedGroups]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const runId = ++routeRun.current;
    setStatus("loading");
    setError(null);
    const initialize = async () => {
      if (plan.required.includes("live")) await closeExpiredRemoteEvents();
      await loadPlan(plan, runId);
    };
    void initialize().catch(() => undefined);
  }, [loadPlan, plan]);

  useEffect(() => {
    if (!isSupabaseConfigured || !plan.required.includes("live")) return;
    let active = true;
    const migrate = async () => {
      const source = readLocalMigrationSource();
      if (!active) return;
      setMigration(source.result);
      if (source.key && source.state) {
        const result = await migrateLocalStateToSupabase(source.state, source.key);
        if (!active) return;
        setMigration(result);
        await closeExpiredRemoteEvents();
        await refreshGroup("live");
      } else if (source.result.status === "invalid") {
        setMigrationError("Lokale PR-5-Daten konnten nicht sicher gelesen werden und wurden nicht gelöscht.");
      }
    };
    void migrate().catch((caught) => active && setMigrationError(getErrorMessage(caught)));
    return () => { active = false; };
  }, [plan, refreshGroup]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const unsubscribe = subscribeToDataPlatform((table) => {
      const activeGroups = allPlanGroups(planRef.current);
      const affected = groupsForRealtimeTable(table).filter((group) => activeGroups.includes(group));
      if (affected.length) scheduleGroups(affected);
    }, (channelStatus) => {
      setRealtimeStatus(channelStatus === "SUBSCRIBED"
        ? "connected"
        : channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT" || channelStatus === "CLOSED"
          ? "disconnected"
          : "connecting");
    });
    return () => {
      unsubscribe();
      if (refetchTimer.current != null) window.clearTimeout(refetchTimer.current);
    };
  }, [scheduleGroups]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") scheduleGroups(allPlanGroups(planRef.current));
    };
    const refreshFocused = () => scheduleGroups(allPlanGroups(planRef.current));
    window.addEventListener("focus", refreshFocused);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.removeEventListener("focus", refreshFocused);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [scheduleGroups]);

  const hasActiveEvent = plan.required.includes("live") &&
    snapshot.liveState.events.some(({ status: value }) => value === "active");
  useEffect(() => {
    if (!hasActiveEvent || !isSupabaseConfigured) return;
    const interval = window.setInterval(() => {
      void closeExpiredRemoteEvents().then(() => scheduleGroups(["live"]))
        .catch(() => setRealtimeStatus("disconnected"));
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [hasActiveEvent, scheduleGroups]);

  const value = useMemo(() => ({
    snapshot,
    status,
    realtimeStatus,
    error,
    migration,
    migrationError,
    groups,
    refresh,
    refreshGroup,
  }), [error, groups, migration, migrationError, realtimeStatus, refresh, refreshGroup, snapshot, status]);
  return <DataPlatformContext.Provider value={value}>{children}</DataPlatformContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataPlatform() {
  const context = useContext(DataPlatformContext);
  if (!context) throw new Error("useDataPlatform muss innerhalb des Providers verwendet werden.");
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataGroup(group: DataGroup) {
  const { groups, refreshGroup } = useDataPlatform();
  const state = groups[group] ?? emptyGroupState();
  return {
    ...state,
    refresh: () => refreshGroup(group),
  };
}
