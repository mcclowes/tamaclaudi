import { watch as fsWatch } from "node:fs";
import { emitKeypressEvents } from "node:readline";
import { renderDashboard, rule } from "../cli/dashboard.js";
import { exists } from "../store/io.js";
import { CreatureNotFoundError } from "../store/io.js";
import { queueAction } from "./actions.js";
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
  /** Read keystrokes and let you chat inline. Defaults to on when stdin is a TTY. */
  interactive?: boolean;
}

/** The shape readline hands us alongside each keystroke. */
export interface KeyEvent {
  name?: string;
  ctrl?: boolean;
  sequence?: string;
}

export interface KeyOutcome {
  /** The chat buffer after this keystroke. */
  input: string;
  /** A message to queue, if Enter was pressed on non-empty input. */
  send?: string;
  /** Whether the user asked to quit (Ctrl-C / Ctrl-D). */
  exit?: boolean;
}

/** Actions you can drive straight from the chat line with a `tama <verb>`. */
export const CHAT_ACTIONS = ["feed", "play", "clean", "rest", "talk"] as const;
export type ChatAction = (typeof CHAT_ACTIONS)[number];

export type ChatInput =
  | { kind: "action"; action: ChatAction; arg?: string }
  | { kind: "talk"; text: string };

/**
 * Decide whether a sent chat line is a command or just something to say. A line
 * that starts with `tama <verb>` (e.g. `tama clean`, `tama feed apple`) runs
 * that action; everything else — including a bare `clean` or a real sentence —
 * stays chat, so normal talk is never hijacked.
 */
export function parseChatInput(msg: string): ChatInput {
  const trimmed = msg.trim();
  const m = /^tama\s+(\S+)\s*([\s\S]*)$/i.exec(trimmed);
  if (m) {
    const verb = m[1]!.toLowerCase();
    if ((CHAT_ACTIONS as readonly string[]).includes(verb)) {
      const arg = m[2]!.trim();
      return { kind: "action", action: verb as ChatAction, arg: arg || undefined };
    }
  }
  return { kind: "talk", text: trimmed };
}

/**
 * Tab-complete the verb right after `tama `. Completes only when exactly one
 * action matches the partial; a bare or ambiguous prefix is left untouched.
 */
export function completeChatInput(input: string): string {
  const m = /^(tama\s+)(\S*)$/i.exec(input);
  if (!m) return input;
  const [, prefix, partial] = m;
  const matches = CHAT_ACTIONS.filter((c) => c.startsWith(partial!.toLowerCase()));
  return matches.length === 1 ? `${prefix}${matches[0]} ` : input;
}

/**
 * The live suggestion list shown as you type: while you're still on the verb
 * right after `tama `, every action whose name matches the partial. Empty once
 * you've moved past the verb or aren't typing a command, so plain chat stays
 * uncluttered.
 */
export function chatSuggestions(input: string): ChatAction[] {
  const m = /^tama\s+(\S*)$/i.exec(input);
  if (!m) return [];
  const partial = m[1]!.toLowerCase();
  return CHAT_ACTIONS.filter((c) => c.startsWith(partial));
}

/**
 * Fold one keystroke into the chat buffer. Pure, so the editing rules — type,
 * backspace, send on Enter, clear on Escape, quit on Ctrl-C — are easy to test
 * without a terminal.
 */
export function handleKey(input: string, str: string | undefined, key: KeyEvent = {}): KeyOutcome {
  if (key.ctrl && (key.name === "c" || key.name === "d")) return { input, exit: true };
  if (key.name === "return" || key.name === "enter") {
    const msg = input.trim();
    return msg ? { input: "", send: msg } : { input: "" };
  }
  if (key.name === "backspace") return { input: input.slice(0, -1) };
  if (key.name === "tab") return { input: completeChatInput(input) };
  if (key.name === "escape") return { input: "" };
  // A single printable character; ignore control and escape sequences.
  if (str && str.length === 1 && str >= " ") return { input: input + str };
  return { input };
}

/** The chat line under the dashboard: a status hint, then the prompt you type into. */
function chatFooter(input: string, status?: string): string {
  const lines = ["", rule("talk to it — or a command like `tama clean` (Tab completes)")];
  if (status) lines.push(`  ${status}`);
  lines.push(`  › ${input}`);
  const suggestions = chatSuggestions(input);
  if (suggestions.length) lines.push(`    ↹ ${suggestions.map((s) => `tama ${s}`).join("   ")}`);
  return lines.join("\n");
}

/**
 * Live view of the creature. Paints a frame now and again every time a body file
 * changes, so you can leave it open beside the soul loop and watch the pet react.
 * When stdin is a TTY it also lets you chat inline: type a line, press Enter, and
 * it's queued like `tama talk` — the soul replies in the feed on the next tick.
 *
 * Returns "" immediately; the watcher and keypress listener keep the process alive.
 */
export function watch(ctx: CommandContext, opts: WatchOptions = {}): string {
  if (!exists(ctx.p)) throw new CreatureNotFoundError(ctx.p.dir);

  const write = opts.write ?? ((frame: string) => process.stdout.write(frame));
  const attach = opts.attach !== false;
  const interactive = opts.interactive ?? (attach && Boolean(process.stdin.isTTY));

  let input = "";
  let status: string | undefined;

  const paint = () => {
    // Refresh "now" each frame so age keeps creeping between ticks.
    let frame = CLEAR + renderDashboard({ ...ctx, now: new Date() }) + "\n";
    if (interactive) frame += chatFooter(input, status);
    write(frame);
  };

  paint();

  if (!attach) return "";

  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounce = opts.debounceMs ?? 150;
  fsWatch(ctx.p.dir, () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      paint();
    }, debounce);
  });

  if (interactive) {
    const stdin = process.stdin;
    emitKeypressEvents(stdin);
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();

    const quit = () => {
      if (stdin.isTTY) stdin.setRawMode(false);
      process.stdout.write("\n");
      process.exit(0);
    };

    stdin.on("keypress", (str: string | undefined, key: KeyEvent = {}) => {
      const out = handleKey(input, str, key);
      input = out.input;
      if (out.exit) return quit();
      if (out.send) {
        try {
          // Stamp with the current time, not the frozen frame time. A `tama <verb>`
          // line runs that action inline; anything else is queued as chat.
          const cmd = parseChatInput(out.send);
          const now = new Date();
          status =
            cmd.kind === "action"
              ? queueAction(cmd.action, cmd.arg, { ...ctx, now })
              : queueAction("talk", cmd.text, { ...ctx, now });
        } catch (err) {
          status = err instanceof Error ? err.message : String(err);
        }
      } else {
        // Any other keystroke clears a stale confirmation.
        status = undefined;
      }
      paint();
    });
  }

  return "";
}
