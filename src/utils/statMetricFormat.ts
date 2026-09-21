import type { MetricFormat } from "@/types/statDashboard";
import { formatTime } from "@/utils/format";

export function formatMetricValue(value: number | null, format: MetricFormat) {
  if (value == null) return "—";
  if (format === "time") return formatTime(value / 100);
  if (format === "percent") return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  if (format === "duration") return `${Math.round(value / 60).toLocaleString("de-DE")} Min.`;
  if (format === "days") return `${Math.round(value).toLocaleString("de-DE")} Tage`;
  return value.toLocaleString("de-DE");
}
