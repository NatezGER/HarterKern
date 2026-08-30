import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AwardAssetImage } from "@/components/common/AwardAssetImage";

vi.mock("@/hooks/useAwardAssets", () => ({
  useAwardAssetUrl: (assetId: string) => assetId ? `https://example.test/${assetId}.webp` : null,
}));

describe("AwardAssetImage", () => {
  it("defers asset decoding and preserves intrinsic container sizing", () => {
    const markup = renderToStaticMarkup(<AwardAssetImage assetId="badge:test" alt="Test" fallback={<span>Fallback</span>} />);
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('decoding="async"');
    expect(markup).toContain("size-full object-contain");
  });

  it("uses the existing fallback when no asset URL exists", () => {
    expect(renderToStaticMarkup(<AwardAssetImage assetId="" alt="Test" fallback={<span>Fallback</span>} />)).toContain("Fallback");
  });
});
