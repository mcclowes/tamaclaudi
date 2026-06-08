import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Goal, GoalOrigin, Proposal, Question, Task } from "../types.js";
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

/** Record the outcome of an approved proposal and mark it done. */
export function resolveProposal(
  id: string,
  result: string,
  p: CreaturePaths = paths(),
): Proposal {
  const items = readProposals(p);
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`No proposal with id ${id}.`);
  if (found.status !== "approved") {
    throw new Error(`Proposal ${id} is ${found.status}, not approved — can't resolve it.`);
  }
  found.status = "done";
  found.result = result;
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

// --- tasks (problems you hand the creature) --------------------------------

export function readTasks(p: CreaturePaths = paths()): Task[] {
  return readArray<Task>(p.tasks);
}

export function writeTasks(items: Task[], p: CreaturePaths = paths()): void {
  writeArray(p.tasks, items);
}

export function addTask(text: string, at: string, p: CreaturePaths = paths()): Task {
  const items = readTasks(p);
  const task: Task = { id: nextId(items, "t"), at, text, status: "open", notes: [] };
  items.push(task);
  writeTasks(items, p);
  return task;
}

function findTask(items: Task[], id: string): Task {
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`No task with id ${id}.`);
  return found;
}

/** The soul logs progress on a task, moving it to 'working'. */
export function noteTask(
  id: string,
  note: string,
  at: string,
  p: CreaturePaths = paths(),
): Task {
  const items = readTasks(p);
  const found = findTask(items, id);
  if (found.status === "done") throw new Error(`Task ${id} is already done.`);
  found.status = "working";
  found.notes.push({ at, text: note });
  writeTasks(items, p);
  return found;
}

/** The soul closes a task with an outcome. */
export function finishTask(
  id: string,
  outcome: string,
  at: string,
  p: CreaturePaths = paths(),
): Task {
  const items = readTasks(p);
  const found = findTask(items, id);
  found.status = "done";
  found.outcome = outcome;
  found.notes.push({ at, text: `done: ${outcome}` });
  writeTasks(items, p);
  return found;
}

// --- goals (the creature's own intentions) ---------------------------------

export function readGoals(p: CreaturePaths = paths()): Goal[] {
  return readArray<Goal>(p.goals);
}

export function writeGoals(items: Goal[], p: CreaturePaths = paths()): void {
  writeArray(p.goals, items);
}

export function addGoal(
  fields: { text: string; origin: GoalOrigin; spark?: string; at: string },
  p: CreaturePaths = paths(),
): Goal {
  const items = readGoals(p);
  const goal: Goal = {
    id: nextId(items, "g"),
    at: fields.at,
    text: fields.text,
    origin: fields.origin,
    spark: fields.spark,
    status: "active",
    notes: [],
  };
  items.push(goal);
  writeGoals(items, p);
  return goal;
}

function findGoal(items: Goal[], id: string): Goal {
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`No goal with id ${id}.`);
  return found;
}

/** The soul logs a reflection or step on an active goal. */
export function noteGoal(
  id: string,
  note: string,
  at: string,
  p: CreaturePaths = paths(),
): Goal {
  const items = readGoals(p);
  const found = findGoal(items, id);
  if (found.status !== "active") throw new Error(`Goal ${id} is ${found.status}, not active.`);
  found.notes.push({ at, text: note });
  writeGoals(items, p);
  return found;
}

/** The soul fulfils a goal it reached. */
export function fulfilGoal(
  id: string,
  outcome: string,
  at: string,
  p: CreaturePaths = paths(),
): Goal {
  const items = readGoals(p);
  const found = findGoal(items, id);
  if (found.status !== "active") throw new Error(`Goal ${id} is ${found.status}, not active.`);
  found.status = "fulfilled";
  found.outcome = outcome;
  found.notes.push({ at, text: `fulfilled: ${outcome}` });
  writeGoals(items, p);
  return found;
}

/** The soul lets go of a goal that no longer fits — graceful, not a failure. */
export function abandonGoal(
  id: string,
  reason: string,
  at: string,
  p: CreaturePaths = paths(),
): Goal {
  const items = readGoals(p);
  const found = findGoal(items, id);
  if (found.status !== "active") throw new Error(`Goal ${id} is ${found.status}, not active.`);
  found.status = "abandoned";
  found.outcome = reason;
  found.notes.push({ at, text: `let go: ${reason}` });
  writeGoals(items, p);
  return found;
}
