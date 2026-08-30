import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface OverlayPlayerOption { id: string; name: string; avatarUrl?: string | null }

export function PlayerOverlaySelector({ options, selectedIds, onChange, loading = false, error = "", max = 5 }: {
  options: OverlayPlayerOption[]; selectedIds: string[]; onChange: (ids: string[]) => void;
  loading?: boolean; error?: string; max?: number;
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name, "de"));
  return <div className="relative mb-4 max-w-full" data-player-overlay-selector>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Spieler einblenden <ChevronDown className="size-4" /></Button>
      {selectedIds.map((id) => { const option = sorted.find((item) => item.id === id); return option ? <button key={id} type="button" onClick={() => onChange(selectedIds.filter((value) => value !== id))} className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/65"><span className="truncate">{option.name}</span><X className="size-3" /><span className="sr-only">{option.name} ausblenden</span></button> : null; })}
    </div>
    {open && <div className="mt-2 grid max-h-64 w-full gap-1 overflow-y-auto rounded-xl border border-white/10 bg-[#151610] p-2 shadow-xl sm:absolute sm:z-30 sm:w-72">{sorted.map((option) => { const checked = selectedIds.includes(option.id); const disabled = !checked && selectedIds.length >= max; return <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/[0.04]"><input type="checkbox" checked={checked} disabled={disabled} onChange={() => onChange(checked ? selectedIds.filter((id) => id !== option.id) : [...selectedIds, option.id])} /><span className="truncate">{option.name}</span></label>; })}</div>}
    {loading && <p className="mt-2 text-xs text-white/35">Spielerlinien werden geladen …</p>}
    {error && <p className="mt-2 text-xs text-amber-200/70">{error}</p>}
  </div>;
}
