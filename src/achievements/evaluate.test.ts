import { describe, it, expect } from "vitest";
import { newlyUnlocked } from "./evaluate.js";
import {
  STATE_ACHIEVEMENTS,
  ALL_ACHIEVEMENTS,
  type Achievement,
  type AchievementContext,
} from "./defs.js";
import { startingNeeds } from "../sim/stats.js";
import { emptyCounters } from "../store/counters.js";
import type { Stats } from "../types.js";

const stats = (over: Partial<Stats> = {}): Stats => ({
  bornAt: "2026-06-06T00:00:00.000Z",
  lastTick: "2026-06-08T00:00:00.000Z",
  stage: "child",
  health: "well",
  needs: startingNeeds(),
  ailingSince: null,
  ...over,
});

const ctx = (over: Partial<Stats> = {}, ageDays = 2): AchievementContext => ({
  stats: stats(over),
  ageDays,
});

const ids = (list: Achievement[]) => list.map((a) => a.id);

describe("newlyUnlocked", () => {
  it("returns only achievements whose condition is met", () => {
    const got = ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx(), []));
    // A 2-day-old child with starting needs has hatched and grown up, but is
    // not an adult, not maxed on any need, and not a week old.
    expect(got).toContain("hatched");
    expect(got).toContain("growing-up");
    expect(got).not.toContain("all-grown");
    expect(got).not.toContain("week-old");
    expect(got).not.toContain("inseparable");
  });

  it("excludes already-unlocked ids so each fires once", () => {
    const got = ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx(), ["hatched", "growing-up"]));
    expect(got).not.toContain("hatched");
    expect(got).not.toContain("growing-up");
  });

  it("unlocks adulthood, bond and thriving at the right thresholds", () => {
    const maxed = { fullness: 100, energy: 100, hygiene: 100, joy: 100, bond: 100 };
    const got = ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx({ stage: "adult", needs: maxed }), []));
    expect(got).toEqual(
      expect.arrayContaining(["all-grown", "inseparable", "well-rested", "stuffed", "spotless", "thriving"]),
    );
  });

  it("unlocks the hidden 'radiant' only on high valence", () => {
    expect(ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx({ valence: 95 }), []))).toContain("radiant");
    expect(ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx({ valence: 50 }), []))).not.toContain("radiant");
  });

  it("unlocks the hidden 'on-the-edge' when a need bottoms out but health holds", () => {
    const needs = { ...startingNeeds(), fullness: 3 };
    expect(ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx({ needs, health: "well" }), []))).toContain("on-the-edge");
    // Once dead it no longer counts as surviving on the edge.
    expect(ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx({ needs, health: "dead" }), []))).not.toContain("on-the-edge");
  });

  it("unlocks 'week-old' only once a week has passed", () => {
    expect(ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx({}, 7))).includes("week-old")).toBe(true);
    expect(ids(newlyUnlocked(STATE_ACHIEVEMENTS, ctx({}, 6))).includes("week-old")).toBe(false);
  });

  it("has unique ids across the whole catalogue", () => {
    const all = ALL_ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it("never unlocks a count-based achievement without counters", () => {
    // A context with no counters: count-based ones must all stay locked.
    const got = ids(newlyUnlocked(ALL_ACHIEVEMENTS, ctx(), []));
    expect(got).not.toContain("well-fed");
    expect(got).not.toContain("seasoned");
  });

  it("unlocks count-based achievements once the tallies cross their thresholds", () => {
    const counters = { ...emptyCounters(), feed: 50, talk: 100, ticks: 1000 };
    const got = ids(newlyUnlocked(ALL_ACHIEVEMENTS, { ...ctx(), counters }, []));
    expect(got).toEqual(expect.arrayContaining(["well-fed", "chatterbox", "seasoned"]));
    expect(got).not.toContain("playful"); // play count still 0
  });
});
