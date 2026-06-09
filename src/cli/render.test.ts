import { describe, it, expect } from "vitest";
import { renderStatus, renderTick } from "./render.js";
import type { Needs, Stats } from "../types.js";
import type { TickChanges } from "../sim/tick.js";

const needs: Needs = { fullness: 100, energy: 50, hygiene: 80, joy: 65, bond: 30 };

const stats: Stats = {
  bornAt: "2026-06-06T00:00:00.000Z",
  lastTick: "2026-06-08T00:00:00.000Z",
  stage: "child",
  health: "well",
  needs,
  ailingSince: null,
};

const baseChanges = (over: Partial<TickChanges> = {}): TickChanges => ({
  hoursElapsed: 2,
  needsBefore: needs,
  needsAfter: needs,
  eventsApplied: [],
  stageChange: null,
  healthChange: null,
  hatched: false,
  died: false,
  warning: null,
  ...over,
});

describe("renderStatus", () => {
  it("shows stage, age, health and a bar per need", () => {
    const out = renderStatus(stats, new Date("2026-06-08T00:00:00.000Z"));
    expect(out).toMatch(/stage:\s+child/);
    expect(out).toMatch(/age:\s+2\.00 days/);
    expect(out).toMatch(/health:\s+well/);
    // fullness 100 → a fully filled bar and the number 100.
    expect(out).toContain("█".repeat(12));
    expect(out).toMatch(/fullness.*100/);
  });
});

describe("renderTick", () => {
  it("reports elapsed hours", () => {
    expect(renderTick(baseChanges({ hoursElapsed: 5 }), stats)).toMatch(/tick: 5\.00h elapsed/);
  });

  it("announces hatching, and suppresses the generic grew-line when hatched", () => {
    const out = renderTick(
      baseChanges({ hatched: true, stageChange: { from: "egg", to: "baby" } }),
      stats,
    );
    expect(out).toContain("✨ the egg hatched!");
    expect(out).not.toMatch(/grew from/);
  });

  it("shows a plain stage change when not hatching", () => {
    const out = renderTick(baseChanges({ stageChange: { from: "child", to: "teen" } }), stats);
    expect(out).toContain("→ grew from child to teen");
  });

  it("shows health changes, warnings, and death", () => {
    const out = renderTick(
      baseChanges({
        healthChange: { from: "well", to: "sick" },
        warning: "fullness is low",
        died: true,
      }),
      stats,
    );
    expect(out).toContain("health: well → sick");
    expect(out).toContain("⚠ fullness is low");
    expect(out).toContain("† the creature has died.");
  });

  it("summarises applied events with and without args", () => {
    const out = renderTick(
      baseChanges({ eventsApplied: [{ type: "feed", arg: "toast" }, { type: "clean" }] }),
      stats,
    );
    expect(out).toContain("you did: feed(toast), clean");
  });

  it("annotates a need delta only when it is at least 0.5", () => {
    const before: Needs = { ...needs, fullness: 60, energy: 50 };
    const after: Needs = { ...needs, fullness: 70, energy: 50.2 };
    const out = renderTick(baseChanges({ needsBefore: before, needsAfter: after }), stats);
    expect(out).toMatch(/fullness\s+70 \(\+10\)/);
    // energy moved by 0.2 — below the threshold, so no annotation.
    expect(out).toMatch(/energy\s+50(?!\s*\()/);
  });
});
