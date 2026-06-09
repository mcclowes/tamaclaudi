import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import { writeStats, writeSeed, writeFeed, ensureDirs } from "../store/io.js";
import { addProposal, addQuestion, addGoal, answerQuestion } from "../store/agency.js";
import { addDeliverable } from "../store/deliverables.js";
import type { CommandContext } from "../commands/context.js";
import type { Seed, Stats } from "../types.js";
import { renderDashboard } from "./dashboard.js";

let dir: string;
let p: CreaturePaths;
const ctxAt = (iso: string): CommandContext => ({ now: new Date(iso), p });

const seed: Seed = {
  name: "Pip",
  bornAt: "2026-06-06T00:00:00.000Z",
  temperament: { boldness: 50, mood: 50, energy: 50, warmth: 50 },
  aspiration: "to be seen",
  likes: { foods: [], games: [], topics: [] },
  dislikes: { foods: [], games: [], topics: [] },
  quirks: [],
  loveLanguage: "play",
  rngSeed: 1,
};

const stats: Stats = {
  bornAt: "2026-06-06T00:00:00.000Z",
  lastTick: "2026-06-08T00:00:00.000Z",
  stage: "child",
  health: "well",
  needs: { fullness: 100, energy: 78, hygiene: 42, joy: 61, bond: 70 },
  ailingSince: null,
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-dash-"));
  p = paths(dir);
  ensureDirs(p);
  writeSeed(seed, p);
  writeStats(stats, p);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("renderDashboard", () => {
  it("nudges you to init when there is no creature", () => {
    rmSync(dir, { recursive: true, force: true });
    expect(renderDashboard(ctxAt("2026-06-08T00:00:00Z"))).toMatch(/tama init/);
  });

  it("shows stage, age, health and a bar per need", () => {
    const out = renderDashboard(ctxAt("2026-06-08T00:00:00Z"));
    expect(out).toMatch(/child · 2\.0d · well/);
    expect(out).toContain("█".repeat(10)); // fullness 100 → full bar
    expect(out).toMatch(/fullness.*100/);
    expect(out).toMatch(/hygiene.*42/);
  });

  it("surfaces the latest feed line", () => {
    writeFeed("oh — thank you! three times! 🥟\n\nmore detail below", p);
    expect(renderDashboard(ctxAt("2026-06-08T00:00:00Z"))).toContain("oh — thank you! three times!");
  });

  it("lists pending proposals and unanswered questions with how to act", () => {
    addProposal({ at: "2026-06-08T00:00:00Z", action: "post Show HN" }, p);
    addQuestion("which project first?", "2026-06-08T00:00:00Z", p);
    const out = renderDashboard(ctxAt("2026-06-08T00:00:00Z"));
    expect(out).toContain("[p1] post Show HN");
    expect(out).toContain("[q1] which project first?");
    expect(out).toMatch(/tama approve p1/);
    expect(out).toMatch(/tama answer q1/);
  });

  it("hides resolved items and says you're caught up", () => {
    const q = addQuestion("answered already?", "2026-06-08T00:00:00Z", p);
    answerQuestion(q.id, "yes", "2026-06-08T01:00:00Z", p);
    const out = renderDashboard(ctxAt("2026-06-08T00:00:00Z"));
    expect(out).not.toContain("answered already?");
    expect(out).toMatch(/caught up/);
  });

  it("lists ready deliverables awaiting a take/shelve decision", () => {
    addDeliverable({ title: "clipped press kit", at: "2026-06-08T00:00:00Z" }, p);
    const out = renderDashboard(ctxAt("2026-06-08T00:00:00Z"));
    expect(out).toContain("[d1] clipped press kit");
    expect(out).toMatch(/tama take d1/);
    expect(out).not.toMatch(/caught up/);
  });

  it("clips an over-long deliverable title so it can't wreck the panel", () => {
    addDeliverable({ title: "x".repeat(200), at: "2026-06-08T00:00:00Z" }, p);
    const out = renderDashboard(ctxAt("2026-06-08T00:00:00Z"));
    const line = out.split("\n").find((l) => l.includes("[d1]"))!;
    expect(line).toContain("…");
    expect(line.length).toBeLessThan(80);
  });

  it("shows active goals only", () => {
    addGoal({ text: "learn one skill a week", origin: "organic", at: "2026-06-08T00:00:00Z" }, p);
    const out = renderDashboard(ctxAt("2026-06-08T00:00:00Z"));
    expect(out).toContain("[g1] learn one skill a week");
  });
});
