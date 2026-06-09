import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import type { CommandContext } from "./context.js";
import { init } from "./init.js";
import { watch, handleKey, parseChatInput, completeChatInput } from "./watch.js";

let dir: string;
let p: CreaturePaths;
const at = (iso: string): CommandContext => ({ now: new Date(iso), p });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-watch-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("watch", () => {
  it("paints one frame immediately and clears the screen", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    const frames: string[] = [];
    watch(at("2026-06-08T00:00:00Z"), { write: (f) => frames.push(f), attach: false });
    expect(frames).toHaveLength(1);
    expect(frames[0]).toContain("\x1b[2J"); // clear-screen escape
    expect(frames[0]).toMatch(/needs you/);
  });

  it("refuses when there is no creature", () => {
    expect(() => watch(at("2026-06-08T00:00:00Z"), { attach: false })).toThrow(/No creature/);
  });

  it("paints the chat prompt when interactive", () => {
    init({ rngSeed: 1, name: "Pip" }, at("2026-06-08T00:00:00Z"));
    const frames: string[] = [];
    watch(at("2026-06-08T00:00:00Z"), {
      write: (f) => frames.push(f),
      attach: false,
      interactive: true,
    });
    expect(frames[0]).toMatch(/talk to it/);
    expect(frames[0]).toMatch(/›/);
  });
});

describe("handleKey", () => {
  it("appends printable characters to the buffer", () => {
    expect(handleKey("hi", "!", {}).input).toBe("hi!");
  });

  it("ignores multi-character control sequences", () => {
    expect(handleKey("hi", "\x1b[A", { name: "up" }).input).toBe("hi");
  });

  it("deletes the last character on backspace", () => {
    expect(handleKey("hi", undefined, { name: "backspace" }).input).toBe("h");
  });

  it("sends a trimmed message on enter and clears the buffer", () => {
    const out = handleKey("  hello  ", undefined, { name: "return" });
    expect(out.send).toBe("hello");
    expect(out.input).toBe("");
  });

  it("does not send an empty or whitespace-only message", () => {
    const out = handleKey("   ", undefined, { name: "return" });
    expect(out.send).toBeUndefined();
    expect(out.input).toBe("");
  });

  it("clears the buffer on escape", () => {
    expect(handleKey("oops", undefined, { name: "escape" }).input).toBe("");
  });

  it("signals exit on ctrl-c and ctrl-d", () => {
    expect(handleKey("x", undefined, { name: "c", ctrl: true }).exit).toBe(true);
    expect(handleKey("x", undefined, { name: "d", ctrl: true }).exit).toBe(true);
  });

  it("completes a command verb on tab", () => {
    expect(handleKey("tama cl", undefined, { name: "tab" }).input).toBe("tama clean ");
  });

  it("does not insert a literal tab character", () => {
    expect(handleKey("hi", "\t", { name: "tab" }).input).toBe("hi");
  });
});

describe("parseChatInput", () => {
  it("runs a tama-prefixed action with no argument", () => {
    expect(parseChatInput("tama clean")).toEqual({ kind: "action", action: "clean" });
    expect(parseChatInput("  TAMA  rest  ")).toEqual({ kind: "action", action: "rest" });
  });

  it("carries the argument for actions that take one", () => {
    expect(parseChatInput("tama feed apple")).toEqual({
      kind: "action",
      action: "feed",
      arg: "apple",
    });
  });

  it("treats a bare verb as chat, not a command", () => {
    expect(parseChatInput("clean")).toEqual({ kind: "talk", text: "clean" });
  });

  it("does not hijack a real sentence that starts with tama", () => {
    expect(parseChatInput("tama hello there")).toEqual({ kind: "talk", text: "tama hello there" });
  });

  it("keeps an ordinary message as chat", () => {
    expect(parseChatInput("you're a cool companion")).toEqual({
      kind: "talk",
      text: "you're a cool companion",
    });
  });
});

describe("completeChatInput", () => {
  it("completes a unique prefix", () => {
    expect(completeChatInput("tama cl")).toBe("tama clean ");
    expect(completeChatInput("tama r")).toBe("tama rest ");
  });

  it("leaves an ambiguous prefix alone", () => {
    // both "feed" and (nothing else starts with f) — but "" matches all, so test a real clash
    expect(completeChatInput("tama ")).toBe("tama ");
  });

  it("leaves a non-command line untouched", () => {
    expect(completeChatInput("hello")).toBe("hello");
  });
});
