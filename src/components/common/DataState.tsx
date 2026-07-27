import { AlertTriangle, Database, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { usePublicData } from "@/hooks/usePublicData";
import { Button } from "@/components/ui/button";

export function DataState({ children }: { children: ReactNode }) {
  const { status, error, refresh } = usePublicData();
  if (status === "ready") return <>{children}</>;

  const content = status === "loading"
    ? { icon: LoaderCircle, title: "Daten werden geladen", text: "Supabase wird abgefragt." }
    : status === "unconfigured"
      ? { icon: Database, title: "Supabase-Setup erforderlich", text: "Trage die öffentlichen Projektwerte in der lokalen .env-Datei ein." }
      : { icon: AlertTriangle, title: "Daten konnten nicht geladen werden", text: error ?? "Bitte versuche es erneut." };
  const Icon = content.icon;

  return (
    <div className="panel grid min-h-64 place-items-center p-8 text-center">
      <div>
        <Icon className={`mx-auto size-7 text-gold-400 ${status === "loading" ? "animate-spin" : ""}`} />
        <h2 className="display-title mt-5 text-2xl">{content.title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/40">{content.text}</p>
        {status === "error" && (
          <Button className="mt-6" variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="size-4" /> Erneut laden
          </Button>
        )}
      </div>
    </div>
  );
}
