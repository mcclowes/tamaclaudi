import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import {
  propose,
  ask,
  proposals,
  approve,
  deny,
  resolve,
  questions,
  answer,
  task,
  tasks,
  taskNote,
  taskDone,
  goal,
  goals,
  goalNote,
  goalDone,
  goalDrop,
} from "./agency.js";
import { readProposals, readQuestions, readTasks, readGoals } from "../store/agency.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
  init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("proposals", () => {
  it("files a pending proposal and lists it", () => {
    propose({ action: "read ~/notes.md", why: "to help plan", command: "cat ~/notes.md" }, at("2026-06-08T01:00:00Z"));
    const stored = readProposals(p);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.status).toBe("pending");
    expect(stored[0]!.id).toBe("p1");
    expect(proposals(at("2026-06-08T01:00:00Z"))).toMatch(/read ~\/notes\.md/);
  });

  it("approving and denying flips status", () => {
    propose({ action: "do a thing" }, at("2026-06-08T01:00:00Z"));
    propose({ action: "do another" }, at("2026-06-08T01:01:00Z"));
    approve("p1", at("2026-06-08T02:00:00Z"));
    deny("p2", at("2026-06-08T02:00:00Z"));
    const stored = readProposals(p);
    expect(stored.find((x) => x.id === "p1")!.status).toBe("approved");
    expect(stored.find((x) => x.id === "p2")!.status).toBe("denied");
    // denied ones drop out of the default (open) view
    expect(proposals(at("x"))).not.toMatch(/do another/);
    expect(proposals(at("x"), true)).toMatch(/do another/);
  });

  it("approve needs an id", () => {
    expect(() => approve(undefined, at("x"))).toThrow(/needs a proposal id/);
  });

  it("resolves an approved proposal, recording the result", () => {
    propose({ action: "do a thing" }, at("2026-06-08T01:00:00Z"));
    approve("p1", at("2026-06-08T02:00:00Z"));
    resolve("p1", "did the thing, all good", at("2026-06-08T03:00:00Z"));
    const stored = readProposals(p);
    expect(stored[0]!.status).toBe("done");
    expect(stored[0]!.result).toMatch(/all good/);
  });

  it("won't resolve a proposal that isn't approved", () => {
    propose({ action: "do a thing" }, at("2026-06-08T01:00:00Z"));
    expect(() => resolve("p1", "snuck it through", at("x"))).toThrow(/not approved/);
  });
});

describe("questions", () => {
  it("files and answers a question", () => {
    ask("what's your favourite colour?", at("2026-06-08T01:00:00Z"));
    expect(questions(at("x"))).toMatch(/favourite colour/);
    answer("q1", "probably teal", at("2026-06-08T03:00:00Z"));
    const stored = readQuestions(p);
    expect(stored[0]!.answer).toBe("probably teal");
    // answered questions drop out of the open view
    expect(questions(at("x"))).toMatch(/no open questions/);
    expect(questions(at("x"), true)).toMatch(/teal/);
  });

  it("ask needs text", () => {
    expect(() => ask(undefined, at("x"))).toThrow(/needs a question/);
  });
});

describe("tasks", () => {
  it("files a problem the creature can work on", () => {
    task("improve the codebase", at("2026-06-08T01:00:00Z"));
    const stored = readTasks(p);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe("t1");
    expect(stored[0]!.status).toBe("open");
    expect(tasks(at("x"))).toMatch(/improve the codebase/);
  });

  it("progresses through working to done, recording notes", () => {
    task("write more tests", at("2026-06-08T01:00:00Z"));
    taskNote("t1", "added 6 tests for the tick function", at("2026-06-08T02:00:00Z"));
    let stored = readTasks(p);
    expect(stored[0]!.status).toBe("working");
    expect(stored[0]!.notes).toHaveLength(1);

    taskDone("t1", "coverage is solid now", at("2026-06-08T03:00:00Z"));
    stored = readTasks(p);
    expect(stored[0]!.status).toBe("done");
    expect(stored[0]!.outcome).toMatch(/solid/);
    // done tasks drop out of the open view
    expect(tasks(at("x"))).toMatch(/no open tasks/);
    expect(tasks(at("x"), true)).toMatch(/write more tests/);
  });

  it("won't note a task that's already done", () => {
    task("a thing", at("2026-06-08T01:00:00Z"));
    taskDone("t1", "done", at("2026-06-08T02:00:00Z"));
    expect(() => taskNote("t1", "more", at("2026-06-08T03:00:00Z"))).toThrow(/already done/);
  });

  it("task needs text", () => {
    expect(() => task(undefined, at("x"))).toThrow(/needs a problem/);
  });
});

describe("goals", () => {
  it("forms a self-set goal, recording its origin and spark", () => {
    goal(
      { text: "reconnect with you", origin: "reactive", spark: "you were away nine hours" },
      at("2026-06-08T01:00:00Z"),
    );
    const stored = readGoals(p);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe("g1");
    expect(stored[0]!.status).toBe("active");
    expect(stored[0]!.origin).toBe("reactive");
    expect(stored[0]!.spark).toBe("you were away nine hours");
    expect(goals(at("x"))).toMatch(/reconnect with you/);
  });

  it("defaults origin to organic when none is given", () => {
    goal({ text: "learn what the stars are" }, at("2026-06-08T01:00:00Z"));
    expect(readGoals(p)[0]!.origin).toBe("organic");
  });

  it("rejects an unknown origin", () => {
    expect(() => goal({ text: "x", origin: "vibes" }, at("x"))).toThrow(/Unknown --origin/);
  });

  it("notes, then fulfils a goal", () => {
    goal({ text: "make you laugh", origin: "owner" }, at("2026-06-08T01:00:00Z"));
    goalNote("g1", "tried a pun, no idea if it landed", at("2026-06-08T02:00:00Z"));
    expect(readGoals(p)[0]!.notes).toHaveLength(1);
    goalDone("g1", "you actually laughed", at("2026-06-08T03:00:00Z"));
    const stored = readGoals(p);
    expect(stored[0]!.status).toBe("fulfilled");
    expect(stored[0]!.outcome).toMatch(/laughed/);
    // fulfilled goals drop out of the active view
    expect(goals(at("x"))).toMatch(/no active goals/);
    expect(goals(at("x"), true)).toMatch(/make you laugh/);
  });

  it("lets a goal go gracefully, and won't touch it after", () => {
    goal({ text: "become a great napper", origin: "organic" }, at("2026-06-08T01:00:00Z"));
    goalDrop("g1", "I'd rather be useful than rested", at("2026-06-08T02:00:00Z"));
    expect(readGoals(p)[0]!.status).toBe("abandoned");
    expect(() => goalNote("g1", "second thoughts", at("2026-06-08T03:00:00Z"))).toThrow(/not active/);
    expect(() => goalDone("g1", "did it", at("2026-06-08T03:00:00Z"))).toThrow(/not active/);
  });

  it("goal needs text, and the sub-commands need an id", () => {
    expect(() => goal({ text: "" }, at("x"))).toThrow(/needs what it wants/);
    expect(() => goalNote(undefined, "x", at("x"))).toThrow(/needs an id/);
    expect(() => goalDone(undefined, "x", at("x"))).toThrow(/needs an id/);
    expect(() => goalDrop(undefined, "x", at("x"))).toThrow(/needs an id/);
  });
});
