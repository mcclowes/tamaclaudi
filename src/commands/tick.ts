import { advance } from "../sim/tick.js";
import {
  drainEvents,
  readConfig,
  readSeed,
  readStats,
  writeStats,
} from "../store/io.js";
import { renderTick } from "../cli/render.js";
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

  const events = drainEvents(ctx.p);
  const { state, changes } = advance(stats, seed, events, ctx.now, config);
  writeStats(state, ctx.p);

  return renderTick(changes, state);
}
