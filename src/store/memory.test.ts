import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MEMORY_BEATS_KEPT } from "../types.js";
import { paths, type CreaturePaths } from "./paths.js";
import { readMemory, rememberBeat, setMood } from "./memory.js";

let dir: string;
let p: CreaturePaths;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("memory store", () => {
  it("starts empty", () => {
    const m = readMemory(p);
    expect(m.mood).toBe("");
    expect(m.beats).toEqual([]);
  });

  it("remembers newest-first", () => {
    rememberBeat("first", "2026-06-09T00:00:00Z", p);
    rememberBeat("second", "2026-06-09T00:01:00Z", p);
    expect(readMemory(p).beats.map((b) => b.text)).toEqual(["second", "first"]);
  });

  it("bounds the beats it keeps", () => {
    for (let i = 0; i < MEMORY_BEATS_KEPT + 5; i++) {
      rememberBeat(`beat ${i}`, "2026-06-09T00:00:00Z", p);
    }
    const beats = readMemory(p).beats;
    expect(beats).toHaveLength(MEMORY_BEATS_KEPT);
    // The most recent survives; the oldest fell off.
    expect(beats[0]!.text).toBe(`beat ${MEMORY_BEATS_KEPT + 4}`);
    expect(beats.some((b) => b.text === "beat 0")).toBe(false);
  });

  it("sets a standing mood without touching beats", () => {
    rememberBeat("a beat", "2026-06-09T00:00:00Z", p);
    setMood("quietly proud", "2026-06-09T00:02:00Z", p);
    const m = readMemory(p);
    expect(m.mood).toBe("quietly proud");
    expect(m.moodSetAt).toBe("2026-06-09T00:02:00Z");
    expect(m.beats).toHaveLength(1);
  });
});
