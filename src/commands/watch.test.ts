import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { watch } from "./watch.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-watch-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("watch", () => {
  it("paints one frame immediately and clears the screen", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    const frames: string[] = [];
    watch(at("2026-06-08T00:00:00Z"), { write: (f) => frames.push(f), attach: false });
    expect(frames).toHaveLength(1);
    expect(frames[0]).toContain("\x1b[2J"); // clear-screen escape
    expect(frames[0]).toMatch(/needs you/);
  });

  it("refuses when there is no creature", () => {
    expect(() => watch(at("2026-06-08T00:00:00Z"), { attach: false })).toThrow(/No creature/);
  });
});
