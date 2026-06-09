import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { tick } from "./tick.js";
import {
  capabilities,
  deliver,
  deliverables,
  take,
  shelve,
  remember,
  mood,
  memory,
} from "./growth.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
  init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("capabilities", () => {
  it("reports nothing when there are no skills yet", () => {
    expect(capabilities(at("2026-06-09T00:00:00Z"))).toMatch(/no skills yet/);
  });

  it("lists banked skills with their name and pointer", () => {
    writeFileSync(
      join(p.skillsDir, "launch.md"),
      "# Skill: launch a small project\n\n**When to use:** a good repo is invisible.\n",
    );
    const out = capabilities(at("2026-06-09T00:00:00Z"));
    expect(out).toMatch(/1 skill/);
    expect(out).toMatch(/launch a small project/);
    expect(out).toMatch(/a good repo is invisible/);
    expect(out).toMatch(/creature\/skills\/launch\.md/);
  });
});

describe("deliverables", () => {
  it("the soul hands back work, you see it ready, then take it", () => {
    deliver({ title: "Show HN draft", summary: "paste-ready", path: "workshop/hn.md" }, at("2026-06-09T00:00:00Z"));
    const ready = deliverables(at("2026-06-09T00:01:00Z"));
    expect(ready).toMatch(/Show HN draft/);
    expect(ready).toMatch(/paste-ready/);
    expect(ready).toMatch(/workshop\/hn\.md/);

    expect(take("d1", "shipped", at("2026-06-09T00:02:00Z"))).toMatch(/took d1/);
    // Once taken it's no longer in the default (ready-only) list.
    expect(deliverables(at("2026-06-09T00:03:00Z"))).toMatch(/nothing ready/);
    expect(deliverables(at("2026-06-09T00:03:00Z"), true)).toMatch(/Show HN draft/);
  });

  it("can shelve a deliverable", () => {
    deliver({ title: "later thing" }, at("2026-06-09T00:00:00Z"));
    expect(shelve("d1", undefined, at("2026-06-09T00:01:00Z"))).toMatch(/shelved d1/);
  });

  it("requires a title", () => {
    expect(() => deliver({ title: "  " }, at("2026-06-09T00:00:00Z"))).toThrow(/needs a title/);
  });
});

describe("memory", () => {
  it("remembers beats and sets a mood, then prints what it carries", () => {
    remember("@mcclowes loved the press kit", at("2026-06-09T00:00:00Z"));
    mood("quietly proud, a bit tired", at("2026-06-09T00:01:00Z"));
    const out = memory(at("2026-06-09T00:02:00Z"));
    expect(out).toMatch(/quietly proud/);
    expect(out).toMatch(/loved the press kit/);
  });

  it("surfaces the carried memory in the tick diff", () => {
    remember("races empty my energy", at("2026-06-09T00:00:00Z"));
    mood("happy and hollow", at("2026-06-09T00:01:00Z"));
    const diff = tick(at("2026-06-09T12:00:00Z"));
    expect(diff).toMatch(/mood: happy and hollow/);
    expect(diff).toMatch(/races empty my energy/);
  });

  it("a fresh tick with empty memory has no recap noise", () => {
    const diff = tick(at("2026-06-09T12:00:00Z"));
    expect(diff).not.toMatch(/carrying:/);
    expect(diff).not.toMatch(/🧠/);
  });
});
