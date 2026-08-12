export interface DatedRecord {
  id: string;
  achievedAt: string;
  timeHundredths: number;
  sequenceNumber?: number;
}

export function getRecordAt<T extends DatedRecord>(records: T[], at: string) {
  return [...records]
    .filter((record) => record.achievedAt <= at)
    .sort((left, right) => right.achievedAt.localeCompare(left.achievedAt) ||
      (left.sequenceNumber != null && right.sequenceNumber != null
        ? right.sequenceNumber - left.sequenceNumber
        : right.id.localeCompare(left.id)))[0] ?? null;
}

export function selectRecordsForPeriod<T extends DatedRecord>(records: T[], startAt: string, endAt: string) {
  const carried = getRecordAt(records, startAt);
  const within = records.filter((record) => record.achievedAt > startAt && record.achievedAt <= endAt);
  return [
    ...(carried ? [{ ...carried, axisAt: startAt, carriedFromBefore: carried.achievedAt < startAt }] : []),
    ...within.map((record) => ({ ...record, axisAt: record.achievedAt, carriedFromBefore: false })),
  ].sort((left, right) => left.axisAt.localeCompare(right.axisAt) || left.id.localeCompare(right.id));
}
