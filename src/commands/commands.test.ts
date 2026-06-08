import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import { exists, readStats } from "../store/io.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { queueAction } from "./actions.js";
import { tick } from "./tick.js";
import { status, listen, diary } from "./read.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("init", () => {
  it("lays an egg with all the files", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    expect(exists(p)).toBe(true);
    const stats = readStats(p);
    expect(stats.stage).toBe("egg");
    expect(stats.health).toBe("well");
  });

  it("refuses to overwrite without --force", () => {
    init({ rngSeed: 1 }, at("2026-06-08T00:00:00Z"));
    expect(() => init({ rngSeed: 2 }, at("2026-06-08T00:00:00Z"))).toThrow(/already lives/);
  });
});

describe("the full loop", () => {
  it("born → hatches → fed → thanks shows in stats", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));

    // Queue a feed, then tick a day later so it has hatched and is hungry.
    queueAction("feed", "berries", at("2026-06-08T18:00:00Z"));
    const diff = tick(at("2026-06-09T00:00:00Z"));

    expect(diff).toMatch(/hatched/);
    const stats = readStats(p);
    expect(stats.stage).not.toBe("egg");
    // The feed event was drained and applied.
    expect(diff).toMatch(/feed\(berries\)/);
  });

  it("status reports mechanical truth with no voice", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    const out = status(at("2026-06-08T00:00:00Z"));
    expect(out).toMatch(/stage:\s+egg/);
    expect(out).toMatch(/fullness/);
  });

  it("talk requires words", () => {
    init({ rngSeed: 1 }, at("2026-06-08T00:00:00Z"));
    expect(() => queueAction("talk", undefined, at("2026-06-08T00:00:00Z"))).toThrow(/needs words/);
  });

  it("listen and diary have friendly empty states", () => {
    init({ rngSeed: 1 }, at("2026-06-08T00:00:00Z"));
    expect(listen(at("2026-06-08T00:00:00Z"))).toContain("egg");
    expect(diary(undefined, at("2026-06-08T00:00:00Z"))).toMatch(/no diary entry/);
  });

  it("actions fail clearly when no creature exists", () => {
    expect(() => queueAction("feed", undefined, at("2026-06-08T00:00:00Z"))).toThrow(/No creature/);
  });
});
