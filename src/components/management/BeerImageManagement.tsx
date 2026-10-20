import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { saveBeerImage } from "@/services/mediaService";
import { BeerBottle } from "@/components/stats/BeerBottle";
import { Button } from "@/components/ui/button";
import { invalidateDataGroups } from "@/services/dataGroupService";

interface BrandImage { brand: string; imagePath: string | null }
export function BeerImageManagement() {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<BrandImage[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    void (async () => {
      const result = await getSupabase().rpc("get_beer_image_catalog", {});
      if (!active) return;
      if (result.error) setError(result.error.message);
      else setRows((result.data ?? []) as unknown as BrandImage[]);
    })().catch(cause => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, [expanded, revision]);
  async function save(row: BrandImage, file?: File) {
    setBusy(true); setError("");
    try {
      await saveBeerImage(row.brand, row.imagePath, file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bildaktion fehlgeschlagen.");
    } finally { invalidateDataGroups(["beer-statistics"]); setBusy(false); setRevision(value => value + 1); }
  }
  return <section className="min-w-0 rounded-2xl border border-white/10 p-4">
    <Button variant="outline" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>Bierbilder verwalten</Button>
    {expanded && <div className="mt-4 space-y-3">
      <p className="text-xs text-white/50">Global für alle Saisons · PNG/WebP bis 5 MB. Freigestellte Flaschen werden vollständig dargestellt.</p>
      {error && <p role="alert">{error}</p>}
      <Button variant="ghost" disabled={busy} onClick={() => { setError(""); setRevision(value => value+1); }}>Neu laden</Button>
      {rows.map(row => <div key={row.brand} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
        <BeerBottle path={row.imagePath} />
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]"><strong>{row.brand}</strong>
          <label className="mt-2 block text-xs">Bild hochladen / ersetzen
            <input className="mt-1 block w-full min-w-0 max-w-full" type="file" accept="image/png,image/webp" disabled={busy}
              onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void save(row, file); }} />
          </label>
        </div>
        {row.imagePath && <Button variant="ghost" disabled={busy} onClick={() => void save(row)}>Bild löschen</Button>}
      </div>)}
    </div>}
  </section>;
}
