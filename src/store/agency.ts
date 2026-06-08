import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Proposal, Question } from "../types.js";
import { paths, type CreaturePaths } from "./paths.js";

function readArray<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as T[];
}

function writeArray(file: string, value: unknown[]): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/** Next id with a given prefix, derived from existing ids — no randomness. */
function nextId<T extends { id: string }>(items: T[], prefix: string): string {
  let max = 0;
  for (const item of items) {
    const n = Number(item.id.replace(prefix, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

// --- proposals -------------------------------------------------------------

export function readProposals(p: CreaturePaths = paths()): Proposal[] {
  return readArray<Proposal>(p.proposals);
}

export function writeProposals(items: Proposal[], p: CreaturePaths = paths()): void {
  writeArray(p.proposals, items);
}

export function addProposal(
  fields: Omit<Proposal, "id" | "status">,
  p: CreaturePaths = paths(),
): Proposal {
  const items = readProposals(p);
  const proposal: Proposal = { ...fields, id: nextId(items, "p"), status: "pending" };
  items.push(proposal);
  writeProposals(items, p);
  return proposal;
}

export function setProposalStatus(
  id: string,
  status: Proposal["status"],
  p: CreaturePaths = paths(),
): Proposal {
  const items = readProposals(p);
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`No proposal with id ${id}.`);
  found.status = status;
  writeProposals(items, p);
  return found;
}

// --- questions -------------------------------------------------------------

export function readQuestions(p: CreaturePaths = paths()): Question[] {
  return readArray<Question>(p.questions);
}

export function writeQuestions(items: Question[], p: CreaturePaths = paths()): void {
  writeArray(p.questions, items);
}

export function addQuestion(
  text: string,
  at: string,
  p: CreaturePaths = paths(),
): Question {
  const items = readQuestions(p);
  const question: Question = { id: nextId(items, "q"), at, text };
  items.push(question);
  writeQuestions(items, p);
  return question;
}

export function answerQuestion(
  id: string,
  answer: string,
  at: string,
  p: CreaturePaths = paths(),
): Question {
  const items = readQuestions(p);
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`No question with id ${id}.`);
  found.answer = answer;
  found.answeredAt = at;
  writeQuestions(items, p);
  return found;
}
