import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ failed:null as string|null, setFailed:vi.fn() }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useState:()=>[state.failed,state.setFailed] }));
import { MilestoneArtwork } from "./MilestoneArtwork";
beforeEach(() => { state.failed=null; state.setFailed.mockClear(); });
describe("MilestoneArtwork", () => {
  it("uses a neutral fallback for absent artwork", () => {
    expect(renderToStaticMarkup(<MilestoneArtwork kind="team-time" title="Test" />)).not.toContain("<img");
  });
  it("switches a failed URL to fallback without poisoning a new URL", () => {
    const props = {kind:"team-time" as const,title:"Test",imageUrl:"https://example.com/one.webp"};
    const tree = MilestoneArtwork(props);
    tree.props.children.props.onError();
    expect(state.setFailed).toHaveBeenCalledWith(props.imageUrl);
    state.failed=props.imageUrl;
    expect(renderToStaticMarkup(<MilestoneArtwork {...props} />)).not.toContain("<img");
    expect(renderToStaticMarkup(<MilestoneArtwork {...props} imageUrl="https://example.com/two.webp" />)).toContain("two.webp");
  });
});
