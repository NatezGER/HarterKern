import type { ChaosEvidence, EndspurtEvidence, RivalryEventEvidence } from "@/types/performanceEvidence";

type Row = Record<string, unknown>;
const row = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string";
const positive = (v: unknown): v is number => Number.isInteger(v) && Number(v) > 0;
const nonnegative = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0;
const reference = (v: unknown): v is Row => row(v) && text(v.eventId) && text(v.eventName) && text(v.eventDate);

// Invalid optional evidence is omitted; the server's ranking remains authoritative.
export function parseEndspurtEvidence(value: unknown): EndspurtEvidence[] | undefined {
  if (!Array.isArray(value) || !value.every(v => reference(v) && positive(v.attemptCount) && v.attemptCount >= 5
    && positive(v.beforePb) && positive(v.finalPb) && nonnegative(v.gain)
    && Array.isArray(v.lastQuarter) && v.lastQuarter.length === Math.floor(v.attemptCount / 4)
    && v.lastQuarter.every(a => row(a) && text(a.attemptId) && positive(a.attemptNumber)
      && typeof a.isDnf === "boolean" && (a.timeHundredths === null || positive(a.timeHundredths))))) return;
  return value as EndspurtEvidence[];
}

export function parseRivalryEvidence(value: unknown): RivalryEventEvidence[] | undefined {
  if (!Array.isArray(value) || !value.every(v => reference(v) && Array.isArray(v.opponents)
    && v.opponents.length > 0 && v.opponents.every(p => row(p) && text(p.playerId) && text(p.name)
      && positive(p.takeovers) && p.takeovers >= 3))) return;
  return value as RivalryEventEvidence[];
}

export function parseChaosEvidence(value: unknown): ChaosEvidence[] | undefined {
  if (!Array.isArray(value) || !value.every(v => reference(v) && text(v.attemptId) && positive(v.attemptNumber) && text(v.submittedAt)
    && positive(v.beforePb) && positive(v.newPb) && positive(v.takeovers)
    && Array.isArray(v.opponents) && (v.opponents.length === Math.min(5, Number(v.takeovers)) || v.opponents.length === v.takeovers)
    && v.opponents.every(p => row(p) && text(p.playerId) && text(p.name) && positive(p.bestHundredths)))) return;
  return value as ChaosEvidence[];
}
