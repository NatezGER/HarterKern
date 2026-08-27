import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminBadgeCatalogSlot } from "@/components/stats/AdminBadgeCatalogSlot";

describe("AdminBadgeCatalogSlot", () => {
  it("is completely absent while management mode is locked", () => {
    expect(renderToStaticMarkup(<AdminBadgeCatalogSlot unlocked={false} />)).toBe("");
  });
});
