/** Old DELETE/UPDATE tuples may contain only the PK under RLS. Treat unknown
 * before-images conservatively; never query eligibility to classify an event. */
export function mayChangeBadgeStatistics(table: "attempts" | "historical_attempts", payload: {
  eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown>;
}) {
  const relevant = (row: Record<string, unknown> | undefined) => {
    if (!row || Object.keys(row).length <= 1) return true;
    if (row.deleted_at != null) return false;
    if (table === "historical_attempts") return row.out_of_competition !== true;
    return row.status === "approved" && row.is_dnf !== true &&
      row.is_ak !== true && row.time_hundredths != null;
  };
  return payload.eventType === "INSERT" ? relevant(payload.new)
    : payload.eventType === "DELETE" ? relevant(payload.old)
      : relevant(payload.old) || relevant(payload.new);
}
