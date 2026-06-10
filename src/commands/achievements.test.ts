import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import { readStats, writeStats } from "../store/io.js";
import { readAchievements, recordUnlocks } from "../store/achievements.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { tick } from "./tick.js";
import { achievementsView } from "./achievements.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
  // Born a few days back so it's hatched and decaying by the time we tick.
  init({ rngSeed: 1, name: "Pip" }, at("2026-06-06T00:00:00Z"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("achievement store", () => {
  it("records new unlocks once and keeps the first-earned timestamp", () => {
    recordUnlocks(["hatched"], new Date("2026-06-08T00:00:00Z"), p);
    recordUnlocks(["hatched"], new Date("2026-06-09T00:00:00Z"), p);
    expect(readAchievements(p).unlocked.hatched).toBe("2026-06-08T00:00:00.000Z");
  });

  it("starts empty for a fresh creature", () => {
    expect(readAchievements(p).unlocked).toEqual({});
  });
});

describe("tick awards achievements", () => {
  it("unlocks and announces state milestones, persisting them", () => {
    const out = tick(at("2026-06-08T00:00:00Z"));
    // A 2-day-old has hatched and grown up; both should be announced and saved.
    expect(out).toMatch(/🏆 unlocked: Out of the Shell/);
    expect(out).toMatch(/🏆 unlocked: Growing Up/);
    const saved = readAchievements(p).unlocked;
    expect(saved).toHaveProperty("hatched");
    expect(saved).toHaveProperty("growing-up");
  });

  it("does not re-announce an achievement already earned", () => {
    tick(at("2026-06-08T00:00:00Z"));
    const second = tick(at("2026-06-08T00:30:00Z"));
    expect(second).not.toMatch(/🏆 unlocked: Out of the Shell/);
  });

  it("unlocks a need-based achievement when the body reaches it", () => {
    // Force bond to 100 and tick with zero elapsed time, so no decay pulls it
    // back below 100 before the check; 'Inseparable' should fire.
    const stats = readStats(p);
    writeStats({ ...stats, lastTick: "2026-06-08T00:10:00.000Z", needs: { ...stats.needs, bond: 100 } }, p);
    const out = tick(at("2026-06-08T00:10:00Z"));
    expect(out).toMatch(/🏆 unlocked: Inseparable/);
  });
});

describe("achievementsView", () => {
  it("shows earned with a date, masks hidden locked ones, and counts the rest", () => {
    recordUnlocks(["hatched"], new Date("2026-06-08T00:00:00Z"), p);
    const out = achievementsView(at("2026-06-08T00:00:00Z"));
    expect(out).toMatch(/✓ Out of the Shell.*2026-06-08/);
    expect(out).toMatch(/Locked:/);
    // Hidden ones (radiant, on-the-edge) are teased as a count, never named.
    expect(out).toMatch(/hidden surprise/);
    expect(out).not.toContain("Radiant");
  });

  it("handles a brand-new creature with nothing earned", () => {
    const out = achievementsView(at("2026-06-08T00:00:00Z"));
    expect(out).toMatch(/None yet/);
  });
});
