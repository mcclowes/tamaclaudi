import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { NEEDS, type CreatureEvent, type Needs } from "../types.js";
import { paths, type CreaturePaths } from "./paths.js";

/**
 * Lifetime tallies the body keeps forever — how many times each care action has
 * happened, how many ticks the creature has lived, and its care streak (a run of
 * consecutive ticks kept comfortable). These feed the count- and streak-based
 * achievements that the point-in-time stats can't answer on their own.
 */
export interface LifetimeCounters {
  feed: number;
  play: number;
  clean: number;
  talk: number;
  rest: number;
  ticks: number;
  /** Consecutive ticks so far with every need at or above the comfort floor. */
  careStreak: number;
  /** The longest such run ever — what the streak achievements reward. */
  bestCareStreak: number;
}

/** A tick "counts" toward the care streak when no need has dipped below this. */
export const STREAK_NEED_FLOOR = 50;

export function emptyCounters(): LifetimeCounters {
  return { feed: 0, play: 0, clean: 0, talk: 0, rest: 0, ticks: 0, careStreak: 0, bestCareStreak: 0 };
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
 * event of each kind, plus one tick, plus the care streak — extended when every
 * need sits at or above the comfort floor this tick, otherwise broken back to
 * zero. Returns and persists the updated counters.
 */
export function bumpCounters(
  events: CreatureEvent[],
  needs: Needs,
  p: CreaturePaths = paths(),
): LifetimeCounters {
  const counters = readCounters(p);
  for (const event of events) counters[event.type] += 1;
  counters.ticks += 1;

  const comfortable = NEEDS.every((n) => needs[n] >= STREAK_NEED_FLOOR);
  counters.careStreak = comfortable ? counters.careStreak + 1 : 0;
  counters.bestCareStreak = Math.max(counters.bestCareStreak, counters.careStreak);

  writeCounters(counters, p);
  return counters;
}
