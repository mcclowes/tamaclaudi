import { readStats } from "../store/io.js";
import {
  addProposal,
  readProposals,
  setProposalStatus,
  resolveProposal,
  addQuestion,
  readQuestions,
  answerQuestion,
  addTask,
  readTasks,
  noteTask,
  finishTask,
  addGoal,
  readGoals,
  noteGoal,
  fulfilGoal,
  abandonGoal,
} from "../store/agency.js";
import { GOAL_ORIGINS, type Goal, type GoalOrigin, type Proposal, type Task } from "../types.js";
import type { CommandContext } from "./context.js";

// --- the soul's side: propose an external action, ask a question -----------

export interface ProposeOptions {
  action: string;
  why?: string;
  command?: string;
}

export function propose(opts: ProposeOptions, ctx: CommandContext): string {
  readStats(ctx.p); // ensure a creature exists
  if (!opts.action.trim()) throw new Error("`tama propose` needs an action.");
  const proposal = addProposal(
    { at: ctx.now.toISOString(), action: opts.action, why: opts.why, command: opts.command },
    ctx.p,
  );
  return `📨 proposal ${proposal.id} filed (pending your approval): ${proposal.action}`;
}

export function ask(text: string | undefined, ctx: CommandContext): string {
  readStats(ctx.p);
  if (!text || !text.trim()) throw new Error('`tama ask` needs a question.');
  const q = addQuestion(text, ctx.now.toISOString(), ctx.p);
  return `❓ question ${q.id} filed: ${q.text}`;
}

// --- your side: review, approve/deny, answer -------------------------------

function renderProposal(p: Proposal): string {
  const lines = [`[${p.id}] (${p.status}) ${p.action}`];
  if (p.why) lines.push(`     why: ${p.why}`);
  if (p.command) lines.push(`     cmd: ${p.command}`);
  if (p.result) lines.push(`     result: ${p.result}`);
  return lines.join("\n");
}

export function proposals(ctx: CommandContext, all = false): string {
  const items = readProposals(ctx.p);
  const show = all ? items : items.filter((p) => p.status === "pending" || p.status === "approved");
  if (!show.length) return all ? "(no proposals)" : "(no open proposals)";
  return show.map(renderProposal).join("\n\n");
}

export function approve(id: string | undefined, ctx: CommandContext): string {
  if (!id) throw new Error("`tama approve` needs a proposal id, e.g. tama approve p1");
  const p = setProposalStatus(id, "approved", ctx.p);
  return `✅ approved ${p.id}: ${p.action}\n   The loop will carry it out on its next tick.`;
}

export function deny(id: string | undefined, ctx: CommandContext): string {
  if (!id) throw new Error("`tama deny` needs a proposal id, e.g. tama deny p1");
  const p = setProposalStatus(id, "denied", ctx.p);
  return `🚫 denied ${p.id}: ${p.action}`;
}

/** The loop calls this after carrying out an approved proposal. */
export function resolve(
  id: string | undefined,
  result: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error('`tama resolve` needs an id and a result: tama resolve p1 "what happened"');
  if (!result || !result.trim()) throw new Error("`tama resolve` needs a result.");
  const p = resolveProposal(id, result, ctx.p);
  return `📌 resolved ${p.id}: ${p.result}`;
}

export function questions(ctx: CommandContext, all = false): string {
  const items = readQuestions(ctx.p);
  const show = all ? items : items.filter((q) => !q.answer);
  if (!show.length) return all ? "(no questions)" : "(no open questions)";
  return show
    .map((q) => `[${q.id}] ${q.text}${q.answer ? `\n     → ${q.answer}` : ""}`)
    .join("\n\n");
}

export function answer(
  id: string | undefined,
  text: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error('`tama answer` needs an id and text: tama answer q1 "..."');
  if (!text || !text.trim()) throw new Error("`tama answer` needs an answer.");
  const q = answerQuestion(id, text, ctx.now.toISOString(), ctx.p);
  return `💡 answered ${q.id}. It'll take it in on the next tick.`;
}

// --- tasks: hand the creature a problem ------------------------------------

export function task(text: string | undefined, ctx: CommandContext): string {
  readStats(ctx.p);
  if (!text || !text.trim()) throw new Error('`tama task` needs a problem: tama task "..."');
  const t = addTask(text, ctx.now.toISOString(), ctx.p);
  return `📋 task ${t.id} filed: ${t.text}\n   It'll start working on it on the next tick.`;
}

function renderTask(t: Task): string {
  const lines = [`[${t.id}] (${t.status}) ${t.text}`];
  for (const note of t.notes) lines.push(`     · ${note.text}`);
  if (t.outcome) lines.push(`     ✓ ${t.outcome}`);
  return lines.join("\n");
}

export function tasks(ctx: CommandContext, all = false): string {
  const items = readTasks(ctx.p);
  const show = all ? items : items.filter((t) => t.status !== "done");
  if (!show.length) return all ? "(no tasks)" : "(no open tasks)";
  return show.map(renderTask).join("\n\n");
}

export function taskNote(
  id: string | undefined,
  note: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error('`tama task-note` needs an id and a note: tama task-note t1 "..."');
  if (!note || !note.trim()) throw new Error("`tama task-note` needs a note.");
  const t = noteTask(id, note, ctx.now.toISOString(), ctx.p);
  return `📝 noted progress on ${t.id}.`;
}

export function taskDone(
  id: string | undefined,
  outcome: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error('`tama task-done` needs an id and an outcome: tama task-done t1 "..."');
  if (!outcome || !outcome.trim()) throw new Error("`tama task-done` needs an outcome.");
  const t = finishTask(id, outcome, ctx.now.toISOString(), ctx.p);
  return `🎉 finished ${t.id}: ${t.outcome}`;
}

// --- goals: the creature's own intentions ----------------------------------

const ORIGIN_LABEL: Record<GoalOrigin, string> = {
  reactive: "reacting to what happened",
  owner: "sensing your needs",
  organic: "of its own accord",
};

export interface GoalOptions {
  text: string;
  origin?: string;
  spark?: string;
}

/** (soul) Form a goal of its own. Origin says which of the three sources it sprang from. */
export function goal(opts: GoalOptions, ctx: CommandContext): string {
  readStats(ctx.p); // ensure a creature exists
  if (!opts.text.trim()) throw new Error('`tama goal` needs what it wants: tama goal "..."');
  const origin = (opts.origin ?? "organic") as GoalOrigin;
  if (!GOAL_ORIGINS.includes(origin)) {
    throw new Error(`Unknown --origin "${opts.origin}". Use one of: ${GOAL_ORIGINS.join(", ")}.`);
  }
  const g = addGoal(
    { text: opts.text, origin, spark: opts.spark, at: ctx.now.toISOString() },
    ctx.p,
  );
  return `🌱 goal ${g.id} formed (${ORIGIN_LABEL[g.origin]}): ${g.text}`;
}

function renderGoal(g: Goal): string {
  const lines = [`[${g.id}] (${g.status}) «${ORIGIN_LABEL[g.origin]}» ${g.text}`];
  if (g.spark) lines.push(`     ↳ sparked by: ${g.spark}`);
  for (const note of g.notes) lines.push(`     · ${note.text}`);
  if (g.outcome) lines.push(`     ✓ ${g.outcome}`);
  return lines.join("\n");
}

/** What your creature wants right now. You watch; you don't set these. */
export function goals(ctx: CommandContext, all = false): string {
  const items = readGoals(ctx.p);
  const show = all ? items : items.filter((g) => g.status === "active");
  if (!show.length) return all ? "(no goals yet)" : "(no active goals)";
  return show.map(renderGoal).join("\n\n");
}

export function goalNote(
  id: string | undefined,
  note: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error('`tama goal-note` needs an id and a note: tama goal-note g1 "..."');
  if (!note || !note.trim()) throw new Error("`tama goal-note` needs a note.");
  const g = noteGoal(id, note, ctx.now.toISOString(), ctx.p);
  return `📝 noted on ${g.id}.`;
}

export function goalDone(
  id: string | undefined,
  outcome: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error('`tama goal-done` needs an id and an outcome: tama goal-done g1 "..."');
  if (!outcome || !outcome.trim()) throw new Error("`tama goal-done` needs an outcome.");
  const g = fulfilGoal(id, outcome, ctx.now.toISOString(), ctx.p);
  return `🌟 fulfilled ${g.id}: ${g.outcome}`;
}

export function goalDrop(
  id: string | undefined,
  reason: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error('`tama goal-drop` needs an id and a reason: tama goal-drop g1 "..."');
  if (!reason || !reason.trim()) throw new Error("`tama goal-drop` needs a reason.");
  const g = abandonGoal(id, reason, ctx.now.toISOString(), ctx.p);
  return `🍃 let go of ${g.id}: ${g.outcome}`;
}
