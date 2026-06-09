import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_MEMORY, MEMORY_BEATS_KEPT, type Memory } from "../types.js";
import { paths, type CreaturePaths } from "./paths.js";

export function readMemory(p: CreaturePaths = paths()): Memory {
  if (!existsSync(p.memory)) return { ...DEFAULT_MEMORY, beats: [] };
  const raw = JSON.parse(readFileSync(p.memory, "utf8")) as Partial<Memory>;
  return {
    mood: raw.mood ?? "",
    moodSetAt: raw.moodSetAt ?? null,
    beats: raw.beats ?? [],
  };
}

export function writeMemory(memory: Memory, p: CreaturePaths = paths()): void {
  writeFileSync(p.memory, JSON.stringify(memory, null, 2) + "\n", "utf8");
}

/**
 * Record one durable beat. Newest first, bounded to MEMORY_BEATS_KEPT so the
 * memory the tick injects (and the tokens it costs) stay small — old beats fall
 * off the end.
 */
export function rememberBeat(text: string, at: string, p: CreaturePaths = paths()): Memory {
  const memory = readMemory(p);
  memory.beats.unshift({ at, text });
  memory.beats = memory.beats.slice(0, MEMORY_BEATS_KEPT);
  writeMemory(memory, p);
  return memory;
}

/** The soul sets its standing mood — psyche, but persisted by the body. */
export function setMood(mood: string, at: string, p: CreaturePaths = paths()): Memory {
  const memory = readMemory(p);
  memory.mood = mood;
  memory.moodSetAt = at;
  writeMemory(memory, p);
  return memory;
}
