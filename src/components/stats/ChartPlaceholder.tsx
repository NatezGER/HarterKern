import { BarChart3 } from "lucide-react";

export function ChartPlaceholder({ title, description, variant = "bars" }: { title: string; description: string; variant?: "bars" | "donut" }) {
  return (
    <div className="panel min-h-80 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-title text-2xl">{title}</h2>
          <p className="mt-1 text-xs text-white/35">{description}</p>
        </div>
        <BarChart3 className="size-5 text-gold-400" />
      </div>
      <div className="mt-8 flex h-48 items-end justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6">
        {variant === "bars" ? (
          [38, 62, 48, 78, 56, 88, 70, 94].map((height, index) => (
            <div key={`${height}-${index}`} className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-gold-600/20 to-gold-300/70" style={{ height: `${height}%` }} />
          ))
        ) : (
          <div className="grid size-40 place-items-center rounded-full bg-[conic-gradient(#e7ba4b_0_42%,#64748b_42%_67%,#9f6e0f_67%_83%,#252725_83%)] shadow-gold-sm">
            <div className="grid size-28 place-items-center rounded-full bg-[#101210] text-center">
              <span className="font-display text-3xl font-black">1.268</span>
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">Visualisierung folgt mit echter Datenquelle</p>
    </div>
  );
}
