import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import { readEvents, readStats, writeStats } from "../store/io.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { queueAction } from "./actions.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
  init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("queueAction", () => {
  it("appends the event to the inbox and confirms", () => {
    const msg = queueAction("feed", "toast", at("2026-06-08T01:00:00Z"));
    expect(msg).toContain("feed");
    expect(msg).toContain("toast");
    const events = readEvents(p);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "feed", arg: "toast" });
  });

  it("each action type has its own confirmation voice", () => {
    expect(queueAction("play", "racing", at("2026-06-08T01:00:00Z"))).toContain("play");
    expect(queueAction("clean", undefined, at("2026-06-08T01:00:00Z"))).toMatch(/scrub|🛁/);
    expect(queueAction("talk", "hello", at("2026-06-08T01:00:00Z"))).toContain("hello");
    expect(queueAction("rest", undefined, at("2026-06-08T01:00:00Z"))).toMatch(/rest|sleep|😴|💤/i);
  });

  it("refuses talk without words", () => {
    expect(() => queueAction("talk", undefined, at("2026-06-08T01:00:00Z"))).toThrow(/needs words/);
    expect(readEvents(p)).toHaveLength(0);
  });

  it("does nothing once the creature has died", () => {
    const stats = readStats(p);
    writeStats({ ...stats, health: "dead" }, p);
    const msg = queueAction("feed", "toast", at("2026-06-08T01:00:00Z"));
    expect(msg).toMatch(/died/);
    expect(readEvents(p)).toHaveLength(0);
  });
});
