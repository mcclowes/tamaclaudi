import { NEEDS, type Needs } from "../types.js";
import { ageDays } from "../sim/stages.js";
import { exists, readStats, readFeed } from "../store/io.js";
import { readProposals, readQuestions, readGoals } from "../store/agency.js";
import { creatureArt } from "./art.js";
import { bar } from "./render.js";
import type { CommandContext } from "../commands/context.js";

const RULE_WIDTH = 46;

/** A titled horizontal rule: ── title ──────────── */
function rule(title: string): string {
  const head = `── ${title} `;
  return head + "─".repeat(Math.max(0, RULE_WIDTH - head.length));
}

/** Lay two columns of text beside each other, padding the left to its widest row. */
function sideBySide(left: string[], right: string[], gap = 4): string[] {
  const width = Math.max(0, ...left.map((l) => l.length));
  const rows = Math.max(left.length, right.length);
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    const l = (left[i] ?? "").padEnd(width);
    const r = right[i] ?? "";
    out.push(`  ${l}${" ".repeat(gap)}${r}`.trimEnd());
  }
  return out;
}

/** One bar row per need: `fullness ██████████ 100`. */
function needRows(needs: Needs): string[] {
  return NEEDS.map((n) => `${n.padEnd(8)} ${bar(needs[n], 10)} ${String(Math.round(needs[n])).padStart(3)}`);
}

/** First few non-empty lines of the feed, each clipped to keep the panel tidy. */
function feedSnippet(feed: string, lines = 3, width = 56): string[] {
  const picked = feed
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, lines);
  if (!picked.length) return ["(quiet — run the soul loop to give it a voice)"];
  return picked.map((l) => (l.length > width ? l.slice(0, width - 1) + "…" : l));
}

/**
 * The live owner's-eye view: the creature, how it's doing, what it's saying, and
 * — the reason to keep this open — anything waiting on you to act. Pure: it reads
 * the body's files and returns a frame, so `tama watch` just paints what it returns.
 */
export function renderDashboard(ctx: CommandContext): string {
  if (!exists(ctx.p)) return "No creature yet. Run `tama init` to lay an egg.";

  const stats = readStats(ctx.p);
  const age = ageDays(stats.bornAt, ctx.now);
  const out: string[] = [];

  out.push(rule(`${stats.stage} · ${age.toFixed(1)}d · ${stats.health}`));
  out.push("");
  out.push(...sideBySide(creatureArt(stats).split("\n"), needRows(stats.needs)));
  out.push("");

  out.push(rule("saying"));
  for (const line of feedSnippet(readFeed(ctx.p))) out.push(`  ${line}`);
  out.push("");

  const pending = readProposals(ctx.p).filter((p) => p.status === "pending");
  const unanswered = readQuestions(ctx.p).filter((q) => !q.answer);
  out.push(rule("needs you"));
  if (!pending.length && !unanswered.length) {
    out.push("  nothing waiting — you're all caught up ✓");
  } else {
    for (const p of pending) out.push(`  ⚠ [${p.id}] ${p.action}`);
    for (const q of unanswered) out.push(`  ? [${q.id}] ${q.text}`);
    const acts: string[] = [];
    if (pending.length) acts.push(`tama approve ${pending[0]!.id}`);
    if (unanswered.length) acts.push(`tama answer ${unanswered[0]!.id} "..."`);
    out.push(`  └ act in another pane: ${acts.join(" · ")}`);
  }
  out.push("");

  const wants = readGoals(ctx.p).filter((g) => g.status === "active");
  out.push(rule("wants"));
  if (!wants.length) out.push("  (no active goals)");
  else for (const g of wants) out.push(`  [${g.id}] ${g.text}`);

  return out.join("\n");
}
