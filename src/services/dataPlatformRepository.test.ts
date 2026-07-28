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

    const cleanup = subscribeToDataPlatform(vi.fn(), vi.fn(), client);
    expect(client.channel).toHaveBeenCalledOnce();
    expect(on).toHaveBeenCalledTimes(5);
    expect(subscribe).toHaveBeenCalledOnce();

    cleanup();
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
