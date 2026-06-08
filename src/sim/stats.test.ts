import { describe, it, expect } from "vitest";
import {
  clamp,
  decayNeeds,
  applyDelta,
  startingNeeds,
  anyInDanger,
  lowestNeed,
  BASE_DECAY_PER_HOUR,
} from "./stats.js";

describe("clamp", () => {
  it("keeps values within 0..100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(42)).toBe(42);
  });
});

describe("decayNeeds", () => {
  it("drops each need by base rate * multiplier * hours", () => {
    const needs = startingNeeds();
    const after = decayNeeds(needs, 1, 1);
    expect(after.fullness).toBe(needs.fullness - BASE_DECAY_PER_HOUR.fullness);
    expect(after.bond).toBeCloseTo(needs.bond - BASE_DECAY_PER_HOUR.bond, 5);
  });

  it("scales with the stage multiplier", () => {
    const needs = startingNeeds();
    const slow = decayNeeds(needs, 1, 0.5);
    const fast = decayNeeds(needs, 1, 2);
    const slowDrop = needs.fullness - slow.fullness;
    const fastDrop = needs.fullness - fast.fullness;
    expect(fastDrop).toBeCloseTo(slowDrop * 4, 5);
  });

  it("never falls below 0", () => {
    const needs = startingNeeds();
    const after = decayNeeds(needs, 1000, 5);
    expect(after.fullness).toBe(0);
    expect(after.joy).toBe(0);
  });

  it("does not mutate the input", () => {
    const needs = startingNeeds();
    const snapshot = { ...needs };
    decayNeeds(needs, 5, 1);
    expect(needs).toEqual(snapshot);
  });
});

describe("applyDelta", () => {
  it("raises and clamps a single need", () => {
    const needs = startingNeeds();
    expect(applyDelta(needs, "fullness", 100).fullness).toBe(100);
    expect(applyDelta(needs, "fullness", -200).fullness).toBe(0);
  });
});

describe("danger helpers", () => {
  it("flags when any need is in the danger zone", () => {
    expect(anyInDanger({ ...startingNeeds(), joy: 10 })).toBe(true);
    expect(anyInDanger(startingNeeds())).toBe(false);
  });

  it("finds the lowest need", () => {
    const low = lowestNeed({ ...startingNeeds(), joy: 3 });
    expect(low.name).toBe("joy");
    expect(low.value).toBe(3);
  });
});
