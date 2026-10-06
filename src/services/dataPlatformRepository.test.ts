import { describe, expect, it, vi } from "vitest";
import { getSupabase } from "@/lib/supabase";
import { subscribeToDataPlatform } from "@/services/dataPlatformRepository";

describe("data platform realtime subscription", () => {
  it("subscribes once to every shared table and removes its channel on cleanup", async () => {
    const on = vi.fn();
    const subscribe = vi.fn();
    const channel = { on, subscribe };
    on.mockReturnValue(channel);
    subscribe.mockReturnValue(channel);
    const removeChannel = vi.fn(async () => "ok");
    const client = {
      channel: vi.fn(() => channel),
      removeChannel,
    } as unknown as Pick<ReturnType<typeof getSupabase>, "channel" | "removeChannel">;

    const onChange = vi.fn();
    const cleanup = subscribeToDataPlatform(onChange, vi.fn(), client);
    expect(client.channel).toHaveBeenCalledOnce();
    expect(on).toHaveBeenCalledTimes(8);
    const pauseSubscription = on.mock.calls.find(([, filter]) => filter.table === "event_statistical_pauses");
    expect(pauseSubscription).toBeDefined();
    pauseSubscription?.[2]();
    expect(onChange).toHaveBeenCalledWith("event_statistical_pauses");
    expect(on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_photos" },
      expect.any(Function),
    );
    expect(subscribe).toHaveBeenCalledOnce();

    cleanup();
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
