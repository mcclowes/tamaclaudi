import { describe, it, expect } from "vitest";
import {
  ageDays,
  stageForAge,
  stageMultiplier,
  stageIndex,
  MS_PER_DAY,
} from "./stages.js";

describe("ageDays", () => {
  it("computes fractional days since birth", () => {
    const born = "2026-06-08T00:00:00Z";
    const now = new Date("2026-06-08T12:00:00Z");
    expect(ageDays(born, now)).toBeCloseTo(0.5, 5);
  });

  it("never returns negative age", () => {
    const born = "2026-06-08T12:00:00Z";
    const now = new Date("2026-06-08T00:00:00Z");
    expect(ageDays(born, now)).toBe(0);
  });
});

describe("stageForAge", () => {
  it("maps age to the right stage", () => {
    expect(stageForAge(0)).toBe("egg");
    expect(stageForAge(0.4)).toBe("egg");
    expect(stageForAge(0.5)).toBe("baby");
    expect(stageForAge(2)).toBe("child");
    expect(stageForAge(5)).toBe("teen");
    expect(stageForAge(9)).toBe("adult");
    expect(stageForAge(100)).toBe("adult");
  });
});

describe("stageMultiplier", () => {
  it("babies decay faster than adults", () => {
    expect(stageMultiplier("baby")).toBeGreaterThan(stageMultiplier("adult"));
  });
  it("an egg does not decay", () => {
    expect(stageMultiplier("egg")).toBe(0);
  });
});

describe("stageIndex", () => {
  it("orders stages by birth order", () => {
    expect(stageIndex("egg")).toBeLessThan(stageIndex("adult"));
    expect(MS_PER_DAY).toBe(86_400_000);
  });
});
