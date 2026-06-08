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
  questions,
  answer,
} from "./agency.js";
import { readProposals, readQuestions } from "../store/agency.js";

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
