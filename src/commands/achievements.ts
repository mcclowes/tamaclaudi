import { ALL_ACHIEVEMENTS } from "../achievements/defs.js";
import { readAchievements } from "../store/achievements.js";
import type { CommandContext } from "./context.js";

/**
 * `tama achievements` — the trophy cabinet. Earned ones show with the day they
 * were won; locked ones tease what's left, except hidden ones, which stay a
 * surprise (counted, not named) until earned.
 */
export function achievementsView(ctx: CommandContext): string {
  const unlocked = readAchievements(ctx.p).unlocked;
  const earned = ALL_ACHIEVEMENTS.filter((a) => a.id in unlocked);
  const locked = ALL_ACHIEVEMENTS.filter((a) => !(a.id in unlocked));
  const hiddenLocked = locked.filter((a) => a.hidden);
  const shownLocked = locked.filter((a) => !a.hidden);

  const lines: string[] = [];
  lines.push(`🏆 Achievements — ${earned.length} earned, ${locked.length} to go`);
  lines.push("");

  if (earned.length) {
    lines.push("Earned:");
    for (const a of earned) {
      const date = unlocked[a.id]?.slice(0, 10);
      lines.push(`  ✓ ${a.title} — ${a.description}${date ? `  (${date})` : ""}`);
    }
  } else {
    lines.push("None yet — your story's just beginning.");
  }

  if (shownLocked.length || hiddenLocked.length) {
    lines.push("");
    lines.push("Locked:");
    for (const a of shownLocked) lines.push(`  · ${a.title} — ${a.description}`);
    if (hiddenLocked.length) {
      lines.push(`  · … and ${hiddenLocked.length} hidden surprise${hiddenLocked.length === 1 ? "" : "s"}`);
    }
  }

  return lines.join("\n");
}
