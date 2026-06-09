import { readStats } from "../store/io.js";
import {
  addDeliverable,
  readDeliverables,
  resolveDeliverable,
} from "../store/deliverables.js";
import { readMemory, rememberBeat, setMood } from "../store/memory.js";
import { readCapabilities } from "../cli/capabilities.js";
import { renderMemory } from "../cli/render.js";
import type { Deliverable } from "../types.js";
import type { CommandContext } from "./context.js";

// --- capabilities: what the creature has learned to do ---------------------

/**
 * Surface the creature's skills as a legible menu, so its accumulated
 * competence is something @mcclowes can actually reach for. Read-only: it just
 * reflects the playbooks the soul has banked in skills/.
 */
export function capabilities(ctx: CommandContext): string {
  readStats(ctx.p); // ensure a creature exists
  const caps = readCapabilities(ctx.p);
  if (!caps.length) {
    return "(no skills yet — your creature banks them in creature/skills/ as it grows)";
  }
  const lines = [`What your creature can do for you (${caps.length} skill${caps.length === 1 ? "" : "s"}):`, ""];
  for (const c of caps) {
    lines.push(`  • ${c.name}`);
    if (c.when) lines.push(`      ${c.when}`);
    lines.push(`      → creature/skills/${c.file}`);
  }
  lines.push("", 'hand it work that uses one:  tama task "..."');
  return lines.join("\n");
}

// --- deliverables: finished work the creature hands back -------------------

export interface DeliverOptions {
  title: string;
  summary?: string;
  path?: string;
}

/** (soul) File a finished piece of work for @mcclowes to pick up. */
export function deliver(opts: DeliverOptions, ctx: CommandContext): string {
  readStats(ctx.p);
  if (!opts.title.trim()) throw new Error('`tama deliver` needs a title: tama deliver "..."');
  const d = addDeliverable(
    { title: opts.title, summary: opts.summary, path: opts.path, at: ctx.now.toISOString() },
    ctx.p,
  );
  return `📦 deliverable ${d.id} ready for you: ${d.title}`;
}

function renderDeliverable(d: Deliverable): string {
  const lines = [`[${d.id}] (${d.status}) ${d.title}`];
  if (d.summary) lines.push(`     ${d.summary}`);
  if (d.path) lines.push(`     → ${d.path}`);
  if (d.outcome) lines.push(`     ✓ ${d.outcome}`);
  return lines.join("\n");
}

export function deliverables(ctx: CommandContext, all = false): string {
  const items = readDeliverables(ctx.p);
  const show = all ? items : items.filter((d) => d.status === "ready");
  if (!show.length) return all ? "(no deliverables)" : "(nothing ready for you right now)";
  return show.map(renderDeliverable).join("\n\n");
}

export function take(
  id: string | undefined,
  note: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error("`tama take` needs a deliverable id, e.g. tama take d1");
  const d = resolveDeliverable(id, "accepted", note?.trim() || undefined, ctx.p);
  return `🤝 took ${d.id}: ${d.title}`;
}

export function shelve(
  id: string | undefined,
  note: string | undefined,
  ctx: CommandContext,
): string {
  if (!id) throw new Error("`tama shelve` needs a deliverable id, e.g. tama shelve d1");
  const d = resolveDeliverable(id, "shelved", note?.trim() || undefined, ctx.p);
  return `🗄  shelved ${d.id}: ${d.title}`;
}

// --- memory: what the creature carries across ticks ------------------------

/** (soul) Record a durable beat worth carrying forward. */
export function remember(text: string | undefined, ctx: CommandContext): string {
  readStats(ctx.p);
  if (!text || !text.trim()) throw new Error('`tama remember` needs something to remember: tama remember "..."');
  rememberBeat(text, ctx.now.toISOString(), ctx.p);
  return `🧠 remembered: ${text}`;
}

/** (soul) Set the standing mood it carries between ticks. */
export function mood(text: string | undefined, ctx: CommandContext): string {
  readStats(ctx.p);
  if (!text || !text.trim()) throw new Error('`tama mood` needs a feeling: tama mood "..."');
  setMood(text, ctx.now.toISOString(), ctx.p);
  return `🫧 mood set: ${text}`;
}

/** Print what the creature is currently carrying. */
export function memory(ctx: CommandContext): string {
  readStats(ctx.p);
  const m = readMemory(ctx.p);
  const block = renderMemory(m);
  return block || "(carrying nothing yet — it remembers as it lives)";
}
