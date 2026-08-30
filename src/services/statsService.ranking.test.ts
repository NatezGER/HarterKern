import { describe, expect, it, vi } from "vitest";

const orders: string[] = [];
interface QueryBuilder {
  select: () => QueryBuilder;
  eq: () => QueryBuilder;
  order: (column: string) => QueryBuilder;
  then: (resolve: (value: { data: never[]; error: null }) => void) => void;
}
const builder: QueryBuilder = { select: () => builder, eq: () => builder, order: (column) => { orders.push(column); return builder; }, then: (resolve) => resolve({ data: [], error: null }) };
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ from: () => builder }) }));
import { getLeaderboard } from "@/services/statsService";

describe("leaderboard display tie ordering", () => {
  it.each(["all-time", 2026] as const)("orders %s by PB, first achievement, name and id without recalculating rank", async (season) => {
    orders.length = 0;
    await getLeaderboard(season);
    expect(orders).toEqual(["personal_best_hundredths", "record_date", "display_name", "player_id"]);
  });
});
