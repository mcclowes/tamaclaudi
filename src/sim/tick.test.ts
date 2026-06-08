import { describe, it, expect } from "vitest";
import { advance } from "./tick.js";
import { startingNeeds } from "./stats.js";
import { DEFAULT_CONFIG, type Config, type Seed, type Stats } from "../types.js";

const seed: Seed = {
  name: "Pip",
  bornAt: "2026-06-08T00:00:00Z",
  temperament: { boldness: 50, mood: 60, energy: 40, warmth: 70 },
  aspiration: "to become a great explorer",
  likes: { foods: ["berries"], games: ["hide and seek"], topics: ["space"] },
  dislikes: { foods: ["broccoli"], games: ["chess"], topics: ["taxes"] },
  quirks: [],
  loveLanguage: "talk",
  rngSeed: 1,
};

function babyStats(overrides: Partial<Stats> = {}): Stats {
  // Born 2 days ago so it is well past hatching and into 'child'/'baby' range.
  return {
    bornAt: "2026-06-07T00:00:00Z",
    lastTick: "2026-06-08T00:00:00Z",
    stage: "baby",
    health: "well",
    needs: startingNeeds(),
    ailingSince: null,
    ...overrides,
  };
}

describe("advance", () => {
  it("decays needs over the elapsed time", () => {
    const stats = babyStats();
    const { state, changes } = advance(
      stats,
      seed,
      [],
      new Date("2026-06-08T02:00:00Z"),
      DEFAULT_CONFIG,
    );
    expect(changes.hoursElapsed).toBeCloseTo(2, 5);
    expect(state.needs.fullness).toBeLessThan(stats.needs.fullness);
    expect(state.lastTick).toBe("2026-06-08T02:00:00.000Z");
  });

  it("applies queued events after decay", () => {
    const stats = babyStats();
    const { state } = advance(
      stats,
      seed,
      [{ at: "2026-06-08T01:00:00Z", type: "feed", arg: "berries" }],
      new Date("2026-06-08T02:00:00Z"),
      DEFAULT_CONFIG,
    );
    // A small decay then a big favourite-food boost nets above the start.
    expect(state.needs.fullness).toBeGreaterThan(startingNeeds().fullness);
  });

  it("does not decay while still an egg", () => {
    const stats: Stats = {
      bornAt: "2026-06-08T00:00:00Z",
      lastTick: "2026-06-08T00:00:00Z",
      stage: "egg",
      health: "well",
      needs: startingNeeds(),
      ailingSince: null,
    };
    const { state, changes } = advance(
      stats,
      seed,
      [],
      new Date("2026-06-08T06:00:00Z"), // still < 0.5 day old
      DEFAULT_CONFIG,
    );
    expect(state.stage).toBe("egg");
    expect(state.needs).toEqual(startingNeeds());
    expect(changes.hatched).toBe(false);
  });

  it("reports hatching when the egg becomes a baby", () => {
    const stats: Stats = {
      bornAt: "2026-06-08T00:00:00Z",
      lastTick: "2026-06-08T00:00:00Z",
      stage: "egg",
      health: "well",
      needs: startingNeeds(),
      ailingSince: null,
    };
    const { state, changes } = advance(
      stats,
      seed,
      [],
      new Date("2026-06-08T13:00:00Z"), // > 0.5 day
      DEFAULT_CONFIG,
    );
    expect(state.stage).toBe("baby");
    expect(changes.hatched).toBe(true);
    expect(changes.stageChange).toEqual({ from: "egg", to: "baby" });
  });

  it("is a no-op once dead", () => {
    const stats = babyStats({ health: "dead" });
    const { state, changes } = advance(
      stats,
      seed,
      [{ at: "x", type: "feed" }],
      new Date("2026-06-09T00:00:00Z"),
      DEFAULT_CONFIG,
    );
    expect(state).toBe(stats);
    expect(changes.eventsApplied).toHaveLength(0);
  });

  it("does not mutate the input state", () => {
    const stats = babyStats();
    const snapshot = JSON.parse(JSON.stringify(stats));
    advance(stats, seed, [], new Date("2026-06-08T05:00:00Z"), DEFAULT_CONFIG);
    expect(stats).toEqual(snapshot);
  });

  it("can kill after long neglect under realStakes", () => {
    const realStakes: Config = { realStakes: true };
    const stats = babyStats({
      needs: { ...startingNeeds(), fullness: 2 },
      ailingSince: "2026-06-06T00:00:00Z",
      health: "sick",
    });
    const { state, changes } = advance(
      stats,
      seed,
      [],
      new Date("2026-06-08T01:00:00Z"),
      realStakes,
    );
    expect(state.health).toBe("dead");
    expect(changes.died).toBe(true);
  });
});
