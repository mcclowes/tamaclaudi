import { watch as fsWatch } from "node:fs";
import { renderDashboard } from "../cli/dashboard.js";
import { exists } from "../store/io.js";
import { CreatureNotFoundError } from "../store/io.js";
import type { CommandContext } from "./context.js";

/** Clear the screen and scrollback, then park the cursor at the top-left. */
const CLEAR = "\x1b[2J\x1b[3J\x1b[H";

export interface WatchOptions {
  /** Where frames go. Injectable so tests can capture them instead of the terminal. */
  write?: (frame: string) => void;
  /** Attach a filesystem watcher. Off in tests, which only want a single frame. */
  attach?: boolean;
  /** Debounce window for coalescing bursts of file writes (ms). */
  debounceMs?: number;
}

/**
 * Live, read-only view of the creature. Paints a frame now and again every time
 * a body file changes, so you can leave it open beside the soul loop and watch
 * the pet react — and see anything waiting on you to approve or answer.
 *
 * Returns "" immediately; the filesystem watcher keeps the process alive.
 */
export function watch(ctx: CommandContext, opts: WatchOptions = {}): string {
  if (!exists(ctx.p)) throw new CreatureNotFoundError(ctx.p.dir);

  const write = opts.write ?? ((frame: string) => process.stdout.write(frame));
  const paint = () => {
    // Refresh "now" each frame so age keeps creeping between ticks.
    write(CLEAR + renderDashboard({ ...ctx, now: new Date() }) + "\n");
  };

  paint();

  if (opts.attach !== false) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounce = opts.debounceMs ?? 150;
    fsWatch(ctx.p.dir, () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        paint();
      }, debounce);
    });
  }

  return "";
}
