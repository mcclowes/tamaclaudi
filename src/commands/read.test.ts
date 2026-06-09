import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths, dateStamp } from "../store/paths.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { status, listen, diary } from "./read.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("status", () => {
  it("reflects the stored stage and health, no voice", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    const out = status(at("2026-06-08T00:00:00Z"));
    expect(out).toContain("stage:  egg");
    expect(out).toContain("health: well");
  });
});

describe("listen", () => {
  it("falls back when the feed is empty", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    writeFileSync(p.feed, "   \n  ");
    expect(listen(at("2026-06-08T00:00:00Z"))).toMatch(/nothing in the feed/);
  });

  it("returns trimmed feed contents when present", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    writeFileSync(p.feed, "\n  hello from Pip  \n");
    expect(listen(at("2026-06-08T00:00:00Z"))).toBe("hello from Pip");
  });
});

describe("diary", () => {
  it("falls back when no page exists for the day", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    expect(diary("2099-01-01", at("2026-06-08T00:00:00Z"))).toBe(
      "(no diary entry for 2099-01-01)",
    );
  });

  it("defaults to today's date when none is given", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    const today = dateStamp(new Date("2026-06-08T00:00:00Z"));
    writeFileSync(join(p.historyDir, `${today}.md`), "dear diary");
    expect(diary(undefined, at("2026-06-08T00:00:00Z"))).toBe("dear diary");
  });
});
