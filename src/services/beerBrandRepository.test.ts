import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => mocks }));
import { startRemoteEvent, createRemoteAttempt, updateRemoteAttempt, updateRemoteEvent, loadLiveState } from "./dataPlatformRepository";
it("keeps SQL create/edit validation identical apart from the explicit beer snapshot", () => {
  const old = readFileSync("supabase/migrations/202607280010_pr6b_live_event_api.sql", "utf8").replace(/\r\n/g, "\n");
  const next = readFileSync("supabase/migrations/202610160071_event_attempt_beer_brand.sql", "utf8").replace(/\r\n/g, "\n");
  const fn = (sql: string, name: string) => sql.match(new RegExp("create or replace function public\\." + name + "\\([\\s\\S]*?\\n\\$\\$;"))?.[0];
  const create = fn(next, "sync_create_event_attempt");
  expect(create).toBeDefined();
  const restoredCreate = create!
    .replace("declare event_beer text;\n", "")
    .replace("  select beer_brand into event_beer from public.events\n  where id = p_event_id and status = 'active' and ends_at > now();\n  if not found then raise exception 'Das Event ist nicht aktiv.'; end if;",
      "  if not exists (\n    select 1 from public.events where id = p_event_id and status = 'active' and ends_at > now()\n  ) then raise exception 'Das Event ist nicht aktiv.'; end if;")
    .split("source, beer_brand").join("source").split("'admin', event_beer").join("'admin'");
  expect(restoredCreate).toBe(fn(old, "sync_create_event_attempt"));
  const update = fn(next, "sync_update_event_attempt_v2");
  expect(update).toBeDefined();
  const restoredUpdate = update!
    .replace("sync_update_event_attempt_v2(", "sync_update_event_attempt(")
    .replace("p_submitted_at timestamptz,\n  p_beer_brand text default null,\n  p_update_beer_brand boolean default false", "p_submitted_at timestamptz")
    .split(",\n      beer_brand = case when p_update_beer_brand then nullif(btrim(p_beer_brand), '') else beer_brand end").join("");
  expect(restoredUpdate).toBe(fn(old, "sync_update_event_attempt"));
  expect(next.match(/as \$\$/g)).toHaveLength(4);
  expect(next.match(/^\$\$;/gm)).toHaveLength(4);
});
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: { eventId: "e", participants: [] }, error: null }); });
it.each([["  Flensburger Pilsener  ", "Flensburger Pilsener"], ["   ", null], [undefined, null]])(
  "normalizes optional start beer %s", async (beerBrand, expected) => {
    await startRemoteEvent({ date: "2026-10-16", participants: [], beerBrand });
    expect(mocks.rpc).toHaveBeenCalledWith("sync_start_event_v5", expect.objectContaining({ p_beer_brand: expected }));
  },
);
it.each(["permanent", "guest"] as const)("does not send beer with %s time or DNF creation", async participantKind => {
  for (const result of ["time", "dns"] as const) {
    await createRemoteAttempt({ playerId: "p", eventId: "e", participantKind, result, timeSeconds: 2.5, date: "2026-10-16", outOfCompetition: false });
    const [rpc, args] = mocks.rpc.mock.calls.at(-1)!;
    expect(rpc).toBe("sync_create_event_attempt");
    expect(args).not.toHaveProperty("p_beer_brand");
    expect(args.p_time_hundredths).toBe(result === "dns" ? null : 250);
    expect(args.p_participant_kind).toBe(participantKind);
  }
});
it("updates or clears only the requested attempt beer, and preserves omitted beer", async () => {
  const current = { id: "a", playerId: "p", eventId: "e", result: "time" as const, timeSeconds: 2.5,
    date: "2026-10-16", submittedAt: "2026-10-16T12:00:00Z", outOfCompetition: false, beerBrand: "Flensburger Pilsener" };
  for (const [beerBrand, expected] of [[" Astra Urtyp ", "Astra Urtyp"], [" ", null], [null, null]] as const) {
    await updateRemoteAttempt("a", current, { beerBrand });
    expect(mocks.rpc).toHaveBeenLastCalledWith("sync_update_event_attempt_v2", expect.objectContaining({
      p_attempt_id: "a", p_beer_brand: expected, p_update_beer_brand: true,
    }));
  }
  await updateRemoteAttempt("a", current, { timeSeconds: 2.4 });
  expect(mocks.rpc.mock.calls.at(-1)![1]).not.toHaveProperty("p_beer_brand");
  expect(mocks.rpc.mock.calls.at(-1)![1]).not.toHaveProperty("p_update_beer_brand");
});
it("updates the event default explicitly without an attempt request", async () => {
  await updateRemoteEvent("e", "Event", "2026-10-16", false, " Astra Urtyp ");
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(mocks.rpc).toHaveBeenLastCalledWith("sync_update_event_v4", expect.objectContaining({ p_beer_brand: "Astra Urtyp", p_update_beer_brand: true }));
  await updateRemoteEvent("e", "Event", "2026-10-16", false, "");
  expect(mocks.rpc).toHaveBeenLastCalledWith("sync_update_event_v4", expect.objectContaining({ p_beer_brand: null, p_update_beer_brand: true }));
});
it("maps persisted event defaults and independent attempt snapshots", async () => {
  const rows: Record<string, unknown[]> = {
    events: [{ id: "e", start_date: "2026-10-16", beer_brand: "Astra Urtyp" }],
    attempts: [{ id: "a", player_id: "p", event_id: "e", submitted_at: "2026-10-16T12:00:00Z", beer_brand: "Flensburger Pilsener" }],
  };
  mocks.from.mockImplementation((table: string) => {
    const builder = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), order: vi.fn(), then: (done: (v: unknown) => unknown) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(done) };
    for (const fn of [builder.select, builder.eq, builder.is, builder.order]) fn.mockReturnValue(builder);
    return builder;
  });
  const state = await loadLiveState([]);
  expect(state.events[0].beerBrand).toBe("Astra Urtyp");
  expect(state.attempts[0].beerBrand).toBe("Flensburger Pilsener");
});
