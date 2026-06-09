import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { config } from "./config.js";
import { readConfig } from "../store/io.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
  init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("config real-stakes", () => {
  it("reports the current value, off by default", () => {
    expect(config([], at("2026-06-09T00:00:00Z"))).toMatch(/real-stakes: off/);
  });

  it("turns real-stakes on and persists it to config.json", () => {
    const out = config(["real-stakes", "on"], at("2026-06-09T00:00:00Z"));
    expect(out).toMatch(/on/);
    expect(readConfig(p).realStakes).toBe(true);
  });

  it("turns real-stakes back off", () => {
    config(["real-stakes", "on"], at("2026-06-09T00:00:00Z"));
    config(["real-stakes", "off"], at("2026-06-09T00:00:00Z"));
    expect(readConfig(p).realStakes).toBe(false);
  });

  it("accepts common synonyms for on/off", () => {
    config(["real-stakes", "true"], at("2026-06-09T00:00:00Z"));
    expect(readConfig(p).realStakes).toBe(true);
    config(["real-stakes", "no"], at("2026-06-09T00:00:00Z"));
    expect(readConfig(p).realStakes).toBe(false);
  });

  it("rejects a value that isn't a toggle", () => {
    expect(() => config(["real-stakes", "maybe"], at("2026-06-09T00:00:00Z"))).toThrow(/on\|off/);
  });

  it("rejects an unknown config key", () => {
    expect(() => config(["wibble", "on"], at("2026-06-09T00:00:00Z"))).toThrow(/[Uu]nknown config key/);
  });

  it("refuses to run when no creature lives here", () => {
    const empty: CommandContext = { now: new Date("2026-06-09T00:00:00Z"), p: paths(join(dir, "nope")) };
    expect(() => config([], empty)).toThrow(/tama init/);
  });
});
