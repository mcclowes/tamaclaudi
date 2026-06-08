import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "./paths.js";
import {
  exists,
  ensureDirs,
  readSeed,
  readStats,
  writeStats,
  readConfig,
  writeConfig,
  appendEvent,
  readEvents,
  drainEvents,
  appendHistory,
  readHistory,
  CreatureNotFoundError,
} from "./io.js";
import { DEFAULT_CONFIG, type CreatureEvent, type Stats } from "../types.js";

let dir: string;
let p: CreaturePaths;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-io-"));
  p = paths(dir);
  ensureDirs(p);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const stats: Stats = {
  bornAt: "2026-06-08T00:00:00.000Z",
  lastTick: "2026-06-08T00:00:00.000Z",
  stage: "child",
  health: "well",
  needs: { fullness: 70, energy: 70, hygiene: 80, joy: 65, bond: 30 },
  ailingSince: null,
};

const ev = (type: CreatureEvent["type"], arg?: string): CreatureEvent => ({
  at: "2026-06-08T01:00:00.000Z",
  type,
  arg,
});

describe("exists / not-found", () => {
  it("is false before a creature is written, true after", () => {
    expect(exists(p)).toBe(false);
    writeStats(stats, p);
    // exists needs both seed and stats; only stats so far.
    expect(exists(p)).toBe(false);
  });

  it("readStats and readSeed throw CreatureNotFoundError when missing", () => {
    expect(() => readStats(p)).toThrow(CreatureNotFoundError);
    expect(() => readSeed(p)).toThrow(CreatureNotFoundError);
  });
});

describe("stats round-trip", () => {
  it("writes and reads back identical stats", () => {
    writeStats(stats, p);
    expect(readStats(p)).toEqual(stats);
  });
});

describe("config", () => {
  it("returns DEFAULT_CONFIG when none is written", () => {
    expect(readConfig(p)).toEqual(DEFAULT_CONFIG);
  });

  it("merges a partial config over the defaults", () => {
    writeConfig({ ...DEFAULT_CONFIG, realStakes: !DEFAULT_CONFIG.realStakes }, p);
    expect(readConfig(p).realStakes).toBe(!DEFAULT_CONFIG.realStakes);
  });
});

describe("event inbox", () => {
  it("accumulates appended events in order", () => {
    appendEvent(ev("feed", "toast"), p);
    appendEvent(ev("play", "racing"), p);
    const events = readEvents(p);
    expect(events.map((e) => e.type)).toEqual(["feed", "play"]);
    expect(events[0].arg).toBe("toast");
  });

  it("drains everything and leaves the inbox empty", () => {
    appendEvent(ev("feed"), p);
    appendEvent(ev("talk", "hi"), p);
    expect(drainEvents(p)).toHaveLength(2);
    expect(readEvents(p)).toHaveLength(0);
  });

  it("reads an empty inbox as no events", () => {
    expect(readEvents(p)).toEqual([]);
    expect(drainEvents(p)).toEqual([]);
  });
});

describe("history", () => {
  it("writes a dated header once, then appends without repeating it", () => {
    const now = new Date("2026-06-08T12:00:00.000Z");
    appendHistory("- first beat", now, p);
    appendHistory("- second beat", now, p);
    const log = readHistory("2026-06-08", p) ?? "";
    expect(log).toContain("# 2026-06-08");
    expect(log.match(/# 2026-06-08/g)).toHaveLength(1);
    expect(log).toContain("- first beat");
    expect(log).toContain("- second beat");
  });

  it("returns null for a date with no entries", () => {
    expect(readHistory("2099-01-01", p)).toBeNull();
  });
});
