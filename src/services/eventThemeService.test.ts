import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  };
  return { builder, from: vi.fn() };
});

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ from: query.from }),
}));

import { getActiveEventTheme } from "@/services/eventService";

describe("active event competition theme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.from.mockReturnValue(query.builder);
    query.builder.select.mockReturnValue(query.builder);
    query.builder.eq.mockReturnValue(query.builder);
    query.builder.is.mockReturnValue(query.builder);
    query.builder.order.mockReturnValue(query.builder);
    query.builder.limit.mockReturnValue(query.builder);
  });

  it("reads only the latest active, non-deleted event and activates Denmark", async () => {
    query.builder.maybeSingle.mockResolvedValue({
      data: { awards_trophies: true, trophy_competition_key: "denmark" },
      error: null,
    });
    await expect(getActiveEventTheme()).resolves.toBe("denmark");
    expect(query.from).toHaveBeenCalledWith("events");
    expect(query.builder.select).toHaveBeenCalledWith("awards_trophies,trophy_competition_key");
    expect(query.builder.eq).toHaveBeenCalledWith("status", "active");
    expect(query.builder.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.builder.order).toHaveBeenCalledWith("started_at", { ascending: false });
    expect(query.builder.limit).toHaveBeenCalledWith(1);
  });

  it("keeps the global shell normal without an active Denmark trophy event", async () => {
    query.builder.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getActiveEventTheme()).resolves.toBe("default");
    query.builder.maybeSingle.mockResolvedValue({
      data: { awards_trophies: false, trophy_competition_key: "denmark" },
      error: null,
    });
    await expect(getActiveEventTheme()).resolves.toBe("default");
  });

  it("lets the optional shell read fail without disguising the error", async () => {
    const failure = new Error("offline");
    query.builder.maybeSingle.mockResolvedValue({ data: null, error: failure });
    await expect(getActiveEventTheme()).rejects.toBe(failure);
  });
});
