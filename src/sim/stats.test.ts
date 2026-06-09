import { describe, it, expect } from "vitest";
import {
  clamp,
  decayNeeds,
  applyDelta,
  startingNeeds,
  anyInDanger,
  lowestNeed,
  BASE_DECAY_PER_HOUR,
  passiveEnergyRegen,
  RESTED_BASELINE,
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

describe("passiveEnergyRegen", () => {
  it("recovers energy toward the rested baseline when a tick is idle", () => {
    const tired = { ...startingNeeds(), energy: 20 };
    const after = passiveEnergyRegen(tired, 2, false);
    expect(after.energy).toBeGreaterThan(tired.energy);
    expect(after.energy).toBeLessThanOrEqual(RESTED_BASELINE);
  });

  it("never lifts energy above the rested baseline on its own", () => {
    const tired = { ...startingNeeds(), energy: RESTED_BASELINE - 1 };
    const after = passiveEnergyRegen(tired, 100, false);
    expect(after.energy).toBe(RESTED_BASELINE);
  });

  it("leaves energy already above the baseline untouched — that takes an active rest", () => {
    const lively = { ...startingNeeds(), energy: RESTED_BASELINE + 20 };
    expect(passiveEnergyRegen(lively, 5, false).energy).toBe(RESTED_BASELINE + 20);
  });

  it("the rested baseline sits inside an active life, so a busy creature in the 60s still recovers on a quiet tick", () => {
    // Regression guard for the baseline being too low to matter: an active
    // creature spends most of its life above 60, and rest must be felt there.
    const busy = { ...startingNeeds(), energy: 65 };
    expect(passiveEnergyRegen(busy, 2, false).energy).toBeGreaterThan(65);
  });

  it("does not recover on a tick where the creature played — play is tiring", () => {
    const tired = { ...startingNeeds(), energy: 20 };
    expect(passiveEnergyRegen(tired, 5, true).energy).toBe(20);
  });

  it("only touches energy, leaving the other needs alone", () => {
    const tired = { ...startingNeeds(), energy: 20 };
    const after = passiveEnergyRegen(tired, 2, false);
    expect({ ...after, energy: tired.energy }).toEqual(tired);
  });
});
