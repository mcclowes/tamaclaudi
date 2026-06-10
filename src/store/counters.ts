import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { CreatureEvent } from "../types.js";
import { paths, type CreaturePaths } from "./paths.js";

/**
 * Lifetime tallies the body keeps forever — how many times each care action has
 * happened, and how many ticks the creature has lived. These feed the
 * count-based achievements ("fed 50 times", "1000 ticks lived") that the
 * point-in-time stats can't answer on their own.
 */
export interface LifetimeCounters {
  feed: number;
  play: number;
  clean: number;
  talk: number;
  rest: number;
  ticks: number;
}

export function emptyCounters(): LifetimeCounters {
  return { feed: 0, play: 0, clean: 0, talk: 0, rest: 0, ticks: 0 };
}

export function readCounters(p: CreaturePaths = paths()): LifetimeCounters {
  if (!existsSync(p.counters)) return emptyCounters();
  const parsed = JSON.parse(readFileSync(p.counters, "utf8")) as Partial<LifetimeCounters>;
  return { ...emptyCounters(), ...parsed };
}

export function writeCounters(counters: LifetimeCounters, p: CreaturePaths = paths()): void {
  writeFileSync(p.counters, JSON.stringify(counters, null, 2) + "\n", "utf8");
}

/**
 * Fold one tick's worth of activity into the lifetime tallies: one per applied
 * event of each kind, plus one tick. Returns and persists the updated counters.
 */
export function bumpCounters(
  events: CreatureEvent[],
  p: CreaturePaths = paths(),
): LifetimeCounters {
  const counters = readCounters(p);
  for (const event of events) counters[event.type] += 1;
  counters.ticks += 1;
  writeCounters(counters, p);
  return counters;
}
