import { describe, expect, it } from "vitest";
import { creatureArt, expressionFor } from "./art.js";
import type { Needs, Stats } from "../types.js";

const needs = (over: Partial<Needs> = {}): Needs => ({
  fullness: 60,
  energy: 60,
  hygiene: 60,
  joy: 60,
  bond: 60,
  ...over,
});

const stats = (over: Partial<Stats> = {}): Stats => ({
  bornAt: "2026-01-01T00:00:00.000Z",
  lastTick: "2026-01-01T00:00:00.000Z",
  stage: "baby",
  health: "well",
  needs: needs(over.needs),
  ailingSince: null,
  ...over,
});

describe("expressionFor", () => {
  it("reads health before needs", () => {
    expect(expressionFor(stats({ health: "dead", needs: needs({ joy: 100 }) }))).toBe("dead");
    expect(expressionFor(stats({ health: "sick", needs: needs({ joy: 100 }) }))).toBe("sick");
  });

  it("is sleepy when energy bottoms out", () => {
    expect(expressionFor(stats({ needs: needs({ energy: 10 }) }))).toBe("sleepy");
  });

  it("is sad when joy or overall needs are low", () => {
    expect(expressionFor(stats({ needs: needs({ joy: 10 }) }))).toBe("sad");
    // joy fine, but everything else is dire enough to drag the average under 25
    expect(
      expressionFor(stats({ needs: needs({ fullness: 5, hygiene: 5, bond: 5, joy: 40 }) })),
    ).toBe("sad");
  });

  it("is happy only when joy is high and needs are well met", () => {
    expect(expressionFor(stats({ needs: needs({ joy: 90 }) }))).toBe("happy");
    // joyful but otherwise run-down: not happy, just content
    expect(expressionFor(stats({ needs: needs({ joy: 90, fullness: 10, hygiene: 20 }) }))).not.toBe(
      "happy",
    );
  });
});

describe("creatureArt", () => {
  it("draws a sealed egg with no face", () => {
    const art = creatureArt(stats({ stage: "egg" }));
    expect(art).not.toContain("o   o");
    expect(art).toContain(".-----.");
  });

  it("shows the mood on its face once hatched", () => {
    expect(creatureArt(stats({ stage: "baby", needs: needs({ joy: 90 }) }))).toContain("^   ^");
    expect(creatureArt(stats({ stage: "baby", health: "dead" }))).toContain("x   x");
  });

  it("draws a bigger rounded body once hatched", () => {
    for (const stage of ["baby", "child", "teen", "adult"] as const) {
      const art = creatureArt(stats({ stage }));
      expect(art).toContain(".---------.");
      expect(art).toContain("'---------'");
    }
  });

  it("grows limbs with age: feet for a child, arms for a teen, an antenna for an adult", () => {
    expect(creatureArt(stats({ stage: "baby" }))).not.toContain("_/   \\_");
    expect(creatureArt(stats({ stage: "child" }))).toContain("_/   \\_");
    expect(creatureArt(stats({ stage: "teen" }))).toContain("\\_");
    expect(creatureArt(stats({ stage: "adult" }))).toContain("\\|/");
  });

  it("every stage still renders more than one line", () => {
    for (const stage of ["baby", "child", "teen", "adult"] as const) {
      expect(creatureArt(stats({ stage })).split("\n").length).toBeGreaterThan(1);
    }
  });
});
