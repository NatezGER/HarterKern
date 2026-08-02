import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useDataGroup } from "@/hooks/useDataPlatform";
import type { DataGroup } from "@/services/dataGroupService";

export function OptionalDataState({ group, children }: { group: DataGroup; children: ReactNode }) {
  const { status, error, refresh } = useDataGroup(group);
  if (status === "ready") return <>{children}</>;
  if (status === "error") {
    return (
      <div className="panel grid min-h-40 place-items-center p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-amber-300" />
          <p className="mt-3 text-sm font-semibold text-white/70">Dieser Bereich konnte nicht geladen werden.</p>
          <p className="mt-1 max-w-md text-xs text-white/35">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void refresh()}>
            <RefreshCw className="size-4" /> Bereich erneut laden
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="panel grid min-h-40 place-items-center p-6 text-center text-sm text-white/40">
      <span><LoaderCircle className="mx-auto mb-3 size-5 animate-spin text-gold-400" />Bereich wird geladen.</span>
    </div>
  );
}
