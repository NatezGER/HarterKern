import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { LiveAvatar } from "@/components/events/LiveAvatar";

const source = "https://example.supabase.co/storage/v1/object/public/player-avatars/player/avatar.png";

describe("PR 7B avatar rendering", () => {
  it("passes the stored URL directly to the original ProfileAvatar img markup", () => {
    const markup = renderToStaticMarkup(<ProfileAvatar id="player" name="Paul" url={source} />);

    expect(markup).toContain(`src="${source}"`);
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('class="size-full rounded-full object-cover object-center"');
    expect(markup).not.toContain("srcset");
    expect(markup).not.toContain("sizes=");
    expect(markup).not.toContain("transform");
    expect(markup).not.toContain("filter");
  });

  it("uses the same image classes for every player without ID-specific rules", () => {
    const paul = renderToStaticMarkup(<ProfileAvatar id="11000000-0000-0000-0000-000000000002" name="Paul" url={source} />);
    const lars = renderToStaticMarkup(<ProfileAvatar id="11000000-0000-0000-0000-000000000003" name="Lars" url={source} />);
    const imageClass = /<img[^>]+class="([^"]+)"/;

    expect(paul.match(imageClass)?.[1]).toBe("size-full rounded-full object-cover object-center");
    expect(lars.match(imageClass)?.[1]).toBe("size-full rounded-full object-cover object-center");
  });

  it("restores the original live avatar image path and classes", () => {
    const markup = renderToStaticMarkup(<LiveAvatar player={{
      id: "player",
      kind: "permanent",
      name: "Paul",
      initials: "P",
      avatarGradient: "from-black to-white",
      avatarUrl: source,
      personalBest: 2.06,
      isAk: false,
    }} />);

    expect(markup).toContain(`src="${source}"`);
    expect(markup).toContain('class="size-full object-cover"');
  });
});
