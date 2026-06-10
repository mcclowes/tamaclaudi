import { describe, it, expect } from "vitest";
import { renderAttention, renderStatus, renderTick } from "./render.js";
import type { Needs, Question, Stats } from "../types.js";
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
  valenceBefore: 60,
  valenceAfter: 60,
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

  it("shows a mood line with valence, its change, and a lag direction", () => {
    // needs here average to wellbeing 65; valence sits below it and rose, so the
    // mood is still lifting toward the better state.
    const out = renderTick(baseChanges({ valenceBefore: 50, valenceAfter: 62 }), stats);
    expect(out).toMatch(/mood:\s+62 \(\+12\)\s+↑ lifting/);
  });

  it("calls the mood steady when valence already matches wellbeing", () => {
    const out = renderTick(baseChanges({ valenceBefore: 65, valenceAfter: 65 }), stats);
    expect(out).toMatch(/mood:\s+65\s+· steady/);
  });

  it("calls the mood settling when valence is coasting above current wellbeing", () => {
    const out = renderTick(baseChanges({ valenceBefore: 92, valenceAfter: 90 }), stats);
    expect(out).toMatch(/mood:\s+90 \(-2\)\s+↓ settling/);
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

  it("surfaces an attention block when one is passed", () => {
    const out = renderTick(baseChanges(), stats, undefined, "💬 @mcclowes answered q2: look here");
    expect(out).toContain("💬 @mcclowes answered q2: look here");
  });
});

describe("renderAttention", () => {
  const q = (over: Partial<Question>): Question => ({
    id: "q1",
    at: "2026-06-08T00:00:00.000Z",
    text: "what next?",
    ...over,
  });
  const since = new Date("2026-06-08T12:00:00.000Z");
  const now = new Date("2026-06-08T13:00:00.000Z");

  it("surfaces a question answered within (since, now]", () => {
    const out = renderAttention(
      [q({ id: "q2", answer: "look in ../foo", answeredAt: "2026-06-08T12:30:00.000Z" })],
      since,
      now,
    );
    expect(out).toContain("💬 @mcclowes answered q2: look in ../foo");
  });

  it("ignores answers from before the window — each surfaces only once", () => {
    const out = renderAttention(
      [q({ id: "q2", answer: "old news", answeredAt: "2026-06-08T09:00:00.000Z" })],
      since,
      now,
    );
    expect(out).toBe("");
  });

  it("ignores questions that have no answer yet", () => {
    expect(renderAttention([q({ id: "q3" })], since, now)).toBe("");
  });
});
