import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "./paths.js";
import {
  addProposal,
  readProposals,
  setProposalStatus,
  resolveProposal,
  addQuestion,
  answerQuestion,
  addTask,
  noteTask,
  finishTask,
  addGoal,
  noteGoal,
  fulfilGoal,
  abandonGoal,
  readGoals,
} from "./agency.js";

let dir: string;
let p: CreaturePaths;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-agency-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const prop = (action: string) => ({ at: "2026-06-08T00:00:00Z", action });

describe("id sequencing", () => {
  it("derives sequential prefixed ids from existing items, no randomness", () => {
    expect(addProposal(prop("a"), p).id).toBe("p1");
    expect(addProposal(prop("b"), p).id).toBe("p2");
    expect(addTask("t", "2026-06-08T00:00:00Z", p).id).toBe("t1");
    expect(addQuestion("q?", "2026-06-08T00:00:00Z", p).id).toBe("q1");
  });
});

describe("proposal lifecycle", () => {
  it("new proposals start pending", () => {
    expect(addProposal(prop("read a thing"), p).status).toBe("pending");
  });

  it("setProposalStatus moves it and persists", () => {
    const { id } = addProposal(prop("x"), p);
    setProposalStatus(id, "approved", p);
    expect(readProposals(p)[0].status).toBe("approved");
  });

  it("resolve records a result and marks done — only from approved", () => {
    const { id } = addProposal(prop("x"), p);
    expect(() => resolveProposal(id, "did it", p)).toThrow(/not approved/);
    setProposalStatus(id, "approved", p);
    const done = resolveProposal(id, "did it", p);
    expect(done.status).toBe("done");
    expect(done.result).toBe("did it");
  });

  it("throws on unknown id", () => {
    expect(() => setProposalStatus("p99", "approved", p)).toThrow(/No proposal/);
  });
});

describe("questions", () => {
  it("records an answer and when it was answered", () => {
    const { id } = addQuestion("favourite colour?", "2026-06-08T00:00:00Z", p);
    const answered = answerQuestion(id, "blue", "2026-06-08T01:00:00Z", p);
    expect(answered.answer).toBe("blue");
    expect(answered.answeredAt).toBe("2026-06-08T01:00:00Z");
  });
});

describe("task lifecycle", () => {
  const now = "2026-06-08T00:00:00Z";

  it("notes move a task to working; finish closes it with an outcome", () => {
    const { id } = addTask("fix the thing", now, p);
    expect(noteTask(id, "started", now, p).status).toBe("working");
    const done = finishTask(id, "shipped", now, p);
    expect(done.status).toBe("done");
    expect(done.outcome).toBe("shipped");
    expect(done.notes.at(-1)?.text).toContain("shipped");
  });

  it("refuses to note or finish an already-done task", () => {
    const { id } = addTask("x", now, p);
    finishTask(id, "done", now, p);
    expect(() => noteTask(id, "more", now, p)).toThrow(/already done/);
    expect(() => finishTask(id, "again", now, p)).toThrow(/already done/);
  });
});

describe("goal lifecycle", () => {
  const now = "2026-06-08T00:00:00Z";
  const newGoal = () => addGoal({ text: "learn", origin: "organic", at: now }, p);

  it("forms active, can be noted, then fulfilled", () => {
    const { id } = newGoal();
    expect(readGoals(p)[0].status).toBe("active");
    noteGoal(id, "a step", now, p);
    const done = fulfilGoal(id, "reached it", now, p);
    expect(done.status).toBe("fulfilled");
    expect(done.outcome).toBe("reached it");
  });

  it("can be gracefully abandoned, and won't transition once resolved", () => {
    const { id } = newGoal();
    const dropped = abandonGoal(id, "no longer fits", now, p);
    expect(dropped.status).toBe("abandoned");
    expect(() => noteGoal(id, "x", now, p)).toThrow(/not active/);
    expect(() => fulfilGoal(id, "x", now, p)).toThrow(/not active/);
  });
});
