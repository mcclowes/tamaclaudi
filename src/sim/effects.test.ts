import { describe, it, expect } from "vitest";
import { applyEvent } from "./effects.js";
import { startingNeeds } from "./stats.js";
import type { CreatureEvent, Seed } from "../types.js";

const seed: Seed = {
  name: "Pip",
  bornAt: "2026-06-08T00:00:00Z",
  temperament: { boldness: 50, mood: 60, energy: 40, warmth: 70 },
  aspiration: "to become a great explorer",
  likes: { foods: ["berries"], games: ["hide and seek"], topics: ["space"] },
  dislikes: { foods: ["broccoli"], games: ["chess"], topics: ["taxes"] },
  quirks: ["hiccups when excited"],
  loveLanguage: "talk",
  rngSeed: 1,
};

const ev = (type: CreatureEvent["type"], arg?: string): CreatureEvent => ({
  at: "2026-06-08T01:00:00Z",
  type,
  arg,
});

describe("applyEvent", () => {
  it("feeding raises fullness by the base amount", () => {
    const hungry = { ...startingNeeds(), fullness: 20 };
    const n = applyEvent(hungry, ev("feed"), seed);
    expect(n.fullness).toBe(20 + 35);
  });

  it("a favourite food raises fullness more than a plain one", () => {
    const hungry = { ...startingNeeds(), fullness: 20 };
    const plain = applyEvent(hungry, ev("feed", "kibble"), seed);
    const fave = applyEvent(hungry, ev("feed", "berries"), seed);
    expect(fave.fullness).toBeGreaterThan(plain.fullness);
  });

  it("a disliked food gives less fullness and a joy sulk", () => {
    const hungry = { ...startingNeeds(), fullness: 20 };
    const plain = applyEvent(hungry, ev("feed", "kibble"), seed);
    const yuck = applyEvent(hungry, ev("feed", "broccoli"), seed);
    expect(yuck.fullness).toBeLessThan(plain.fullness);
    expect(yuck.joy).toBeLessThan(plain.joy);
  });

  it("playing costs energy", () => {
    const n = applyEvent(startingNeeds(), ev("play"), seed);
    expect(n.energy).toBe(startingNeeds().energy - 15);
  });

  it("talking gets a love-language bond bonus when that is its love language", () => {
    const talk = applyEvent(startingNeeds(), ev("talk", "hello"), seed);
    // base bond 18 + love-language 10 = 28
    expect(talk.bond).toBe(startingNeeds().bond + 28);
  });

  it("clamps at 100", () => {
    const full = { ...startingNeeds(), fullness: 95 };
    expect(applyEvent(full, ev("feed", "berries"), seed).fullness).toBe(100);
  });

  it("a disliked food near a full belly only loses its dislike penalty, not extra from an early clamp", () => {
    // base feed +35, dislike penalty -round(35/2)=-18, so net +17.
    // From 95 the net carries it to the cap; an early clamp on the +35 would
    // wrongly shave the penalty off 100 and land at 82.
    const nearFull = { ...startingNeeds(), fullness: 95 };
    expect(applyEvent(nearFull, ev("feed", "broccoli"), seed).fullness).toBe(100);
  });
});
