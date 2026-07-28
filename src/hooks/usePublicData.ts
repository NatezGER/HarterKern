import { useDataPlatform } from "@/hooks/useDataPlatform";

export function usePublicData() {
  const { snapshot, status, error, refresh } = useDataPlatform();
  return {
    data: snapshot.publicData,
    status,
    error,
    refresh,
  };
}
