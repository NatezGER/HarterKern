import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RankTrend } from "@/types";

export function RankIndicator({ trend }: { trend: RankTrend }) {
  const Icon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
      trend === "up" && "text-emerald-400",
      trend === "down" && "text-red-400",
      trend === "same" && "text-white/30",
    )}>
      <Icon className="size-3" />
      {trend === "same" ? "gleich" : trend}
    </span>
  );
}
