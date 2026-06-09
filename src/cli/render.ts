import { NEEDS, type Memory, type Needs, type Stats } from "../types.js";
import { ageDays } from "../sim/stages.js";
import { creatureArt } from "./art.js";
import type { TickChanges } from "../sim/tick.js";

export function bar(value: number, width = 12): string {
  const filled = Math.round((value / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function needLines(needs: Needs): string {
  return NEEDS.map(
    (n) => `  ${n.padEnd(9)} ${bar(needs[n])} ${String(Math.round(needs[n])).padStart(3)}`,
  ).join("\n");
}

/** Mechanical truth, no voice — what `tama status` prints. */
export function renderStatus(stats: Stats, now: Date): string {
  const age = ageDays(stats.bornAt, now);
  return [
    creatureArt(stats),
    "",
    `stage:  ${stats.stage}`,
    `age:    ${age.toFixed(2)} days`,
    `health: ${stats.health}`,
    `needs:`,
    needLines(stats.needs),
  ].join("\n");
}

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : `${r}`;
}

/** How many recent beats to surface in a tick recap — enough to carry, few enough to stay cheap. */
const RECAP_BEATS = 3;

/**
 * The compact memory recap. Shown in every tick so the loop carries its mood and
 * a few recent beats without re-reading flat files. Empty string when there's
 * nothing yet, so callers can skip it cleanly.
 */
export function renderMemory(memory: Memory, beats = RECAP_BEATS): string {
  const lines: string[] = [];
  if (memory.mood.trim()) lines.push(`🧠 mood: ${memory.mood.trim()}`);
  const recent = memory.beats.slice(0, beats);
  if (recent.length) {
    if (!lines.length) lines.push("🧠 carrying:");
    else lines.push("   carrying:");
    for (const b of recent) lines.push(`   · ${b.text}`);
  }
  return lines.join("\n");
}

/** The diff `tama tick` prints — what the soul loop reads to interpret. */
export function renderTick(changes: TickChanges, stats: Stats, memory?: Memory): string {
  const lines: string[] = [];
  lines.push(creatureArt(stats), "");
  lines.push(`tick: ${changes.hoursElapsed.toFixed(2)}h elapsed`);

  if (changes.hatched) lines.push("✨ the egg hatched!");
  if (changes.stageChange && !changes.hatched) {
    lines.push(`→ grew from ${changes.stageChange.from} to ${changes.stageChange.to}`);
  }
  if (changes.healthChange) {
    lines.push(`health: ${changes.healthChange.from} → ${changes.healthChange.to}`);
  }
  if (changes.eventsApplied.length) {
    const summary = changes.eventsApplied
      .map((e) => (e.arg ? `${e.type}(${e.arg})` : e.type))
      .join(", ");
    lines.push(`you did: ${summary}`);
  }

  lines.push("needs:");
  for (const n of NEEDS) {
    const before = changes.needsBefore[n];
    const after = changes.needsAfter[n];
    const delta = after - before;
    const note = Math.abs(delta) >= 0.5 ? ` (${signed(delta)})` : "";
    lines.push(`  ${n.padEnd(9)} ${String(Math.round(after)).padStart(3)}${note}`);
  }

  if (changes.warning) lines.push(`⚠ ${changes.warning}`);
  if (changes.died) lines.push("† the creature has died.");

  if (memory) {
    const recap = renderMemory(memory);
    if (recap) lines.push("", recap);
  }

  return lines.join("\n");
}
