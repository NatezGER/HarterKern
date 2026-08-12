import type { DataGroupPatch } from "@/services/dataGroupService";
import type { DataPlatformSnapshot } from "@/services/dataPlatformRepository";

export function shouldMergeRun(expectedRun: number | undefined, currentRun: number) {
  return expectedRun == null || expectedRun === currentRun;
}

export function mergePatchForRun(
  snapshot: DataPlatformSnapshot,
  patch: DataGroupPatch,
  expectedRun: number | undefined,
  currentRun: number,
): DataPlatformSnapshot {
  if (!shouldMergeRun(expectedRun, currentRun)) return snapshot;
  return {
    publicData: patch.publicData
      ? { ...snapshot.publicData, ...patch.publicData }
      : snapshot.publicData,
    liveState: patch.liveState
      ? { ...snapshot.liveState, ...patch.liveState }
      : snapshot.liveState,
  };
}
