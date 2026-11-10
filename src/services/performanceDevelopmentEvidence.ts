import type { DevelopmentEvidence } from "@/types/performanceDevelopment";
const row = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const text = (v: unknown) => typeof v === "string";
const source = (v: unknown) => row(v) && text(v.id) && text(v.date) && number(v.time) && v.time > 0 && text(v.source) && typeof v.exact === "boolean" && (v.eventId === null || text(v.eventId));
export function parseDevelopmentEvidence(v: unknown): DevelopmentEvidence | undefined {
  if (!row(v)) return;
  const numbers = (...keys: string[]) => keys.every(k => number(v[k]));
  let valid = false;
  switch (v.kind) {
    case "spiral": valid = text(v.eventId) && text(v.eventName) && text(v.eventDate) && numbers("start", "end", "length")
      && Number(v.end) - Number(v.start) === v.length && Array.isArray(v.attempts) && v.attempts.length === Number(v.length) + 1
      && v.attempts.every(a => row(a) && text(a.id) && number(a.number) && number(a.time)); break;
    case "trend": valid = numbers("olderMedian", "newerMedian") && v.samples === 10 && Array.isArray(v.older) && Array.isArray(v.newer)
      && v.older.length === 5 && v.newer.length === 5 && [...v.older, ...v.newer].every(source); break;
    case "hunt": valid = source(v.before) && source(v.after) && numbers("length", "intermediate") && Number(v.intermediate) + 1 === v.length; break;
    case "plateau": valid = source(v.pb) && source(v.first) && source(v.last) && numbers("length") && (v.season === null || number(v.season)); break;
    case "near": valid = numbers("total", "limit") && Array.isArray(v.hits) && v.hits.length <= Number(v.limit)
      && v.hits.every(h => row(h) && source(h) && number(h.priorPb) && number(h.gap) && h.gap >= 1 && h.gap <= 10); break;
    case "consistent": valid = numbers("samples", "cv", "mean", "population", "target", "cutoff", "qualified") && Number(v.samples) >= 10; break;
  }
  return valid ? v as unknown as DevelopmentEvidence : undefined;
}
