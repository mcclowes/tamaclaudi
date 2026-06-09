import { advance } from "../sim/tick.js";
import { ageDays, stageForAge } from "../sim/stages.js";
import {
  drainEvents,
  readConfig,
  readSeed,
  readStats,
  writeStats,
} from "../store/io.js";
import { readMemory } from "../store/memory.js";
import { readQuestions } from "../store/agency.js";
import { renderAttention, renderTick } from "../cli/render.js";
import type { CommandContext } from "./context.js";

/**
 * Advance the body: drain the event inbox, roll time forward, persist the new
 * stats, and print the diff the soul loop reads. Does NOT write any soul files
 * (CLAUDE.md, feed.md, diary) — that's the loop's job, not the body's.
 */
export function tick(ctx: CommandContext): string {
  const seed = readSeed(ctx.p);
  const stats = readStats(ctx.p);
  const config = readConfig(ctx.p);

  if (stats.health === "dead") {
    return "tick: the creature has died. The body no longer moves.";
  }

  // Captured before advance overwrites lastTick: the window for "what changed
  // since the soul last looked", used to surface @mcclowes's between-tick replies.
  const lastLooked = new Date(stats.lastTick);

  // An egg has no needs yet, so anything queued before it hatches would be
  // spent for nothing. Leave the inbox untouched while still an egg; the events
  // wait and are drained on the first tick after hatching.
  const stillEgg = stageForAge(ageDays(stats.bornAt, ctx.now)) === "egg";
  const events = stillEgg ? [] : drainEvents(ctx.p);
  const { state, changes } = advance(stats, seed, events, ctx.now, config);
  writeStats(state, ctx.p);

  // Surface what the creature is carrying (mood + recent beats) and any reply
  // @mcclowes left since the last tick, so the loop reads its memory and its
  // news in the same diff it reads its body — no extra file read each tick.
  const attention = renderAttention(readQuestions(ctx.p), lastLooked, ctx.now);
  return renderTick(changes, state, readMemory(ctx.p), attention);
}
