import type { EventType } from "../types.js";
import { appendEvent, readStats } from "../store/io.js";
import type { CommandContext } from "./context.js";

const CONFIRM: Record<EventType, (arg?: string) => string> = {
  feed: (arg) => `🍽  queued: feed${arg ? ` (${arg})` : ""}. It'll tuck in on the next tick.`,
  play: (arg) => `🎲 queued: play${arg ? ` (${arg})` : ""}. Get ready to have fun.`,
  clean: () => `🛁 queued: clean. A scrub is on the way.`,
  talk: (arg) => `💬 queued: you said "${arg}". It'll reply on the next tick.`,
};

/**
 * The four interactive commands share one shape: append an event to the inbox
 * and confirm. The body feels it on the next tick; the soul replies the tick
 * after. That small delay is intentional.
 */
export function queueAction(
  type: EventType,
  arg: string | undefined,
  ctx: CommandContext,
): string {
  // Touch stats so we fail clearly if there's no creature yet.
  const stats = readStats(ctx.p);
  if (stats.health === "dead") {
    return "Your creature has died. There's nothing more to do but remember it.";
  }

  if (type === "talk" && !arg) {
    throw new Error('`tama talk` needs words: tama talk "good morning"');
  }

  appendEvent({ at: ctx.now.toISOString(), type, arg }, ctx.p);
  return CONFIRM[type](arg);
}
