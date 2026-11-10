import { describe, expect, it } from "vitest";
import { eventBeerOptions, normalizeBeerBrand } from "./beerSelection";
import type { LiveAttempt } from "@/types/liveEvent";
describe("event beer choices", () => {
  it("uses only the current event, puts default first, trims and deduplicates", () => {
    const attempts = [{eventId:"e",beerBrand:" A "},{eventId:"e",beerBrand:"B"},{eventId:"other",beerBrand:"C"},{eventId:"e",beerBrand:null}] as LiveAttempt[];
    expect(eventBeerOptions("e"," A ",attempts)).toEqual(["A","B"]);
    expect(eventBeerOptions("e",null,attempts)).toEqual(["A","B"]);
  });
  it("supports unknown beer without inventing a brand", () => {
    expect(normalizeBeerBrand("   ")).toBeNull();
    expect(normalizeBeerBrand(undefined)).toBeNull();
    expect(normalizeBeerBrand(" Kölsch ")).toBe("Kölsch");
  });
});
