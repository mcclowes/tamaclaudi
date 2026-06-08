import { NEEDS, type Needs, type Stats } from "../types.js";
import { ageDays } from "../sim/stages.js";
import { creatureArt } from "./art.js";
import type { TickChanges } from "../sim/tick.js";

function bar(value: number, width = 12): string {
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

/** The diff `tama tick` prints — what the soul loop reads to interpret. */
export function renderTick(changes: TickChanges, stats: Stats): string {
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

  return lines.join("\n");
}
