import type { Player } from "@/types";
import { formatTime } from "@/utils/format";

export function FormChartPlaceholder({ player }: { player: Player }) {
  const max = Math.max(...player.form);
  const min = Math.min(...player.form);
  const range = max - min || 1;
  const points = player.form.map((value, index) => {
    const x = (index / (player.form.length - 1)) * 100;
    const y = 82 - ((max - value) / range) * 58;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20 p-5">
      <div className="absolute inset-0 bg-hero-grid bg-[size:36px_36px] opacity-35" />
      <svg aria-label="Formkurve der letzten fünf Versuche" viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e7ba4b" stopOpacity=".3" />
            <stop offset="100%" stopColor="#e7ba4b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#chart-fill)" />
        <polyline points={points} fill="none" stroke="#e7ba4b" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.split(" ").map((point, index) => {
          const [cx, cy] = point.split(",");
          return <circle key={point} cx={cx} cy={cy} r="1.8" fill="#080909" stroke="#f6d98a" strokeWidth="1" vectorEffect="non-scaling-stroke"><title>{formatTime(player.form[index])}</title></circle>;
        })}
      </svg>
      <div className="absolute bottom-4 left-5 right-5 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/25">
        <span>Vor 5 Versuchen</span><span>Aktuell</span>
      </div>
    </div>
  );
}
