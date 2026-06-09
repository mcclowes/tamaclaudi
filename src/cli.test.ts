import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseFlags, run } from "./cli.js";
import { paths, type CreaturePaths } from "./store/paths.js";
import type { CommandContext } from "./commands/context.js";

describe("parseFlags", () => {
  it("separates positionals from flags", () => {
    const { positional, flags } = parseFlags(["feed", "toast"]);
    expect(positional).toEqual(["feed", "toast"]);
    expect(flags.size).toBe(0);
  });

  it("consumes the next arg as the value for a value-flag", () => {
    const { positional, flags } = parseFlags(["init", "--seed", "42", "Pip"]);
    expect(positional).toEqual(["init", "Pip"]);
    expect(flags.get("seed")).toBe("42");
  });

  it("treats non-value flags as booleans", () => {
    const { flags } = parseFlags(["init", "--force", "--real-stakes"]);
    expect(flags.get("force")).toBe(true);
    expect(flags.get("real-stakes")).toBe(true);
  });

  it("does not swallow a following positional for a boolean flag", () => {
    const { positional, flags } = parseFlags(["tasks", "--all", "extra"]);
    expect(flags.get("all")).toBe(true);
    expect(positional).toEqual(["tasks", "extra"]);
  });

  it("falls back to boolean when a value-flag ends the args", () => {
    const { flags } = parseFlags(["init", "--seed"]);
    expect(flags.get("seed")).toBe(true);
  });

  it("handles value-flags and positionals interleaved", () => {
    const { positional, flags } = parseFlags(["propose", "read", "--why", "context", "issue"]);
    expect(positional).toEqual(["propose", "read", "issue"]);
    expect(flags.get("why")).toBe("context");
  });
});

describe("run dispatch", () => {
  let dir: string;
  let ctx: CommandContext;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "tama-"));
    const p: CreaturePaths = paths(dir);
    ctx = { now: new Date("2026-06-08T00:00:00Z"), p };
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("prints help for no command and every help alias", () => {
    for (const argv of [[], ["help"], ["--help"], ["-h"]]) {
      expect(run(argv, ctx)).toContain("Usage: tama <command>");
    }
  });

  it("throws on an unknown command, echoing help", () => {
    expect(() => run(["frobnicate"], ctx)).toThrow(/Unknown command: frobnicate/);
  });

  it("routes a real command through to its handler", () => {
    const out = run(["init", "Pip", "--seed", "1"], ctx);
    expect(out).toMatch(/Pip|egg|lives/i);
    // a second command now sees the creature the first one created
    expect(run(["status"], ctx)).toContain("stage:");
  });

  it("dispatches every interactive and read route to a non-empty result", () => {
    run(["init", "Pip", "--seed", "1"], ctx);
    const routes: string[][] = [
      ["feed", "toast"],
      ["play", "racing"],
      ["clean"],
      ["rest"],
      ["talk", "hello", "there"],
      ["tick"],
      ["listen"],
      ["diary"],
    ];
    for (const argv of routes) {
      expect(run(argv, ctx).length).toBeGreaterThan(0);
    }
  });

  it("dispatches the agency routes — listers, soul writers, and adjudication", () => {
    run(["init", "Pip", "--seed", "1"], ctx);
    // soul-side writers create records (two proposals and two goals so each
    // adjudication route below lands on a target in a valid state).
    run(["task", "do", "a", "thing"], ctx); // t1
    run(["goal", "want", "one", "--origin", "organic"], ctx); // g1
    run(["goal", "want", "two", "--origin", "organic"], ctx); // g2
    run(["propose", "act", "--why", "reason", "--cmd", "echo hi"], ctx); // p1
    run(["propose", "act", "again", "--why", "reason"], ctx); // p2
    run(["ask", "a", "question"], ctx); // q1

    // listers read them back
    for (const cmd of ["tasks", "goals", "proposals", "questions"]) {
      expect(run([cmd, "--all"], ctx).length).toBeGreaterThan(0);
    }

    // adjudication + soul notes, each on a validly-staged target
    for (const argv of [
      ["approve", "p1"],
      ["deny", "p2"],
      ["resolve", "p1", "done"], // p1 was approved, so it can resolve
      ["answer", "q1", "yes"],
      ["task-note", "t1", "a note"],
      ["task-done", "t1", "an outcome"],
      ["goal-note", "g1", "a step"],
      ["goal-done", "g1", "reached"],
      ["goal-drop", "g2", "letting go"],
    ]) {
      expect(run(argv, ctx).length).toBeGreaterThan(0);
    }
  });
});

describe("defaultContext", () => {
  it("builds a context with the given time and the default paths", async () => {
    const { defaultContext } = await import("./commands/context.js");
    const now = new Date("2026-06-08T00:00:00Z");
    const ctx = defaultContext(now);
    expect(ctx.now).toBe(now);
    expect(ctx.p.feed).toMatch(/feed\.md$/);
  });
});
