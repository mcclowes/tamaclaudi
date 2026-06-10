import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "./paths.js";
import { readCounters, bumpCounters, emptyCounters } from "./counters.js";
import type { CreatureEvent, Needs } from "../types.js";

let dir: string;
let p: CreaturePaths;
const ev = (type: CreatureEvent["type"]): CreatureEvent => ({ at: "2026-06-08T00:00:00Z", type });
// Comfortable by default (every need above the streak floor); override to break a streak.
const comfy = (over: Partial<Needs> = {}): Needs => ({ fullness: 80, energy: 80, hygiene: 80, joy: 80, bond: 80, ...over });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("counters store", () => {
  it("starts at all zeroes when nothing is saved", () => {
    expect(readCounters(p)).toEqual(emptyCounters());
  });

  it("counts one per applied event and one tick per bump, persisting", () => {
    bumpCounters([ev("feed"), ev("feed"), ev("play")], comfy(), p);
    bumpCounters([ev("clean")], comfy(), p);
    const c = readCounters(p);
    expect(c.feed).toBe(2);
    expect(c.play).toBe(1);
    expect(c.clean).toBe(1);
    expect(c.talk).toBe(0);
    expect(c.ticks).toBe(2); // two bumps, even though one had no feed/play
  });

  it("a quiet bump (no events) still advances the tick count", () => {
    bumpCounters([], comfy(), p);
    bumpCounters([], comfy(), p);
    expect(readCounters(p).ticks).toBe(2);
  });

  it("extends the care streak while comfortable and tracks the best", () => {
    bumpCounters([], comfy(), p);
    bumpCounters([], comfy(), p);
    bumpCounters([], comfy(), p);
    const c = readCounters(p);
    expect(c.careStreak).toBe(3);
    expect(c.bestCareStreak).toBe(3);
  });

  it("breaks the streak when any need dips below the floor, keeping the best", () => {
    bumpCounters([], comfy(), p);
    bumpCounters([], comfy(), p); // streak 2
    bumpCounters([], comfy({ joy: 10 }), p); // a need below floor → break
    const c = readCounters(p);
    expect(c.careStreak).toBe(0);
    expect(c.bestCareStreak).toBe(2);
  });

  it("fills in any missing field from an older partial file", () => {
    // Simulate a counters file written before a field existed.
    writeFileSync(p.counters, JSON.stringify({ feed: 5 }), "utf8");
    const c = readCounters(p);
    expect(c.feed).toBe(5);
    expect(c.rest).toBe(0);
    expect(c.ticks).toBe(0);
  });
});
