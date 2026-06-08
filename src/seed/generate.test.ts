import { describe, it, expect } from "vitest";
import { generateSeed, makeRng } from "./generate.js";
import { TEMPERAMENT_AXES } from "../types.js";

const bornAt = "2026-06-08T00:00:00Z";

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("generateSeed", () => {
  it("is reproducible for the same rngSeed", () => {
    const a = generateSeed({ rngSeed: 7, bornAt });
    const b = generateSeed({ rngSeed: 7, bornAt });
    expect(a).toEqual(b);
  });

  it("produces different creatures for different seeds", () => {
    const a = generateSeed({ rngSeed: 1, bornAt });
    const b = generateSeed({ rngSeed: 2, bornAt });
    expect(a).not.toEqual(b);
  });

  it("honours a forced name", () => {
    const s = generateSeed({ rngSeed: 1, name: "Custard", bornAt });
    expect(s.name).toBe("Custard");
  });

  it("rolls every temperament axis within range", () => {
    const s = generateSeed({ rngSeed: 99, bornAt });
    for (const axis of TEMPERAMENT_AXES) {
      expect(s.temperament[axis]).toBeGreaterThanOrEqual(5);
      expect(s.temperament[axis]).toBeLessThanOrEqual(95);
    }
  });

  it("keeps likes and dislikes disjoint", () => {
    const s = generateSeed({ rngSeed: 123, bornAt });
    const overlap = s.likes.foods.filter((f) => s.dislikes.foods.includes(f));
    expect(overlap).toHaveLength(0);
  });

  it("rolls at least one quirk", () => {
    const s = generateSeed({ rngSeed: 5, bornAt });
    expect(s.quirks.length).toBeGreaterThanOrEqual(1);
  });
});
