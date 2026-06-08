import { readStats, readFeed, readHistory } from "../store/io.js";
import { renderStatus } from "../cli/render.js";
import { dateStamp } from "../store/paths.js";
import type { CommandContext } from "./context.js";

/** Mechanical truth, no voice. */
export function status(ctx: CommandContext): string {
  return renderStatus(readStats(ctx.p), ctx.now);
}

/** What the creature is currently saying to you. */
export function listen(ctx: CommandContext): string {
  const feed = readFeed(ctx.p).trim();
  return feed.length ? feed : "(nothing in the feed yet — run the soul loop)";
}

/** Print a dated diary page. Defaults to today. */
export function diary(date: string | undefined, ctx: CommandContext): string {
  const day = date ?? dateStamp(ctx.now);
  const page = readHistory(day, ctx.p);
  return page ?? `(no diary entry for ${day})`;
}
