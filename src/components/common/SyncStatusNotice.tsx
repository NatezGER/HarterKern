import { AlertTriangle, CloudOff } from "lucide-react";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { useLiveEvent } from "@/hooks/useLiveEvent";

export function SyncStatusNotice() {
  const { status, realtimeStatus, migrationError, error } = useDataPlatform();
  const { mutationError } = useLiveEvent();
  const message = mutationError
    ?? migrationError
    ?? (status === "error" ? error : null)
    ?? (status === "unconfigured"
      ? "Supabase ist nicht konfiguriert. Produktive Live-Daten können nicht gespeichert werden."
      : realtimeStatus === "disconnected"
        ? "Realtime ist getrennt. Die App synchronisiert erneut bei Fokus und im Live-Intervall."
        : null);
  if (!message) return null;
  const Icon = status === "unconfigured" ? CloudOff : AlertTriangle;
  return (
    <aside
      role="status"
      className="border-b border-amber-400/20 bg-amber-400/[0.07] px-5 py-2.5 text-center text-xs text-amber-100"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="size-3.5" /> {message}
      </span>
    </aside>
  );
}
