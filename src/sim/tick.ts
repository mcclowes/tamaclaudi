import type {
  Config,
  CreatureEvent,
  Health,
  Needs,
  Seed,
  Stage,
  Stats,
} from "../types.js";
import { decayNeeds } from "./stats.js";
import {
  MS_PER_DAY,
  STAGE_ONSET_DAYS,
  ageDays,
  stageForAge,
  stageMultiplier,
} from "./stages.js";
import { applyEvent } from "./effects.js";
import { computeHealth } from "./health.js";

const MS_PER_HOUR = 60 * 60 * 1000;

export interface TickChanges {
  hoursElapsed: number;
  needsBefore: Needs;
  needsAfter: Needs;
  eventsApplied: { type: CreatureEvent["type"]; arg?: string }[];
  stageChange: { from: Stage; to: Stage } | null;
  healthChange: { from: Health; to: Health } | null;
  hatched: boolean;
  died: boolean;
  warning: string | null;
}

export interface TickResult {
  state: Stats;
  changes: TickChanges;
}

function emptyChanges(stats: Stats): TickChanges {
  return {
    hoursElapsed: 0,
    needsBefore: stats.needs,
    needsAfter: stats.needs,
    eventsApplied: [],
    stageChange: null,
    healthChange: null,
    hatched: false,
    died: false,
    warning: null,
  };
}

/**
 * The heart of the body. Rolls time forward from `stats.lastTick` to `now`:
 * decays needs (skipping the egg phase, which has none), applies queued events
 * through the seed, recomputes stage and health, and returns a structured diff.
 * Pure: no I/O, no randomness, no clock reads.
 */
export function advance(
  stats: Stats,
  seed: Seed,
  events: CreatureEvent[],
  now: Date,
  config: Config,
): TickResult {
  // A dead creature stays put. The soul can still narrate, but nothing moves.
  if (stats.health === "dead") {
    return { state: stats, changes: emptyChanges(stats) };
  }

  const bornMs = new Date(stats.bornAt).getTime();
  const lastTickMs = new Date(stats.lastTick).getTime();
  const nowMs = now.getTime();
  const hoursElapsed = Math.max(0, (nowMs - lastTickMs) / MS_PER_HOUR);

  const stageBefore = stats.stage;
  const stageAfter = stageForAge(ageDays(stats.bornAt, now));

  // Needs only decay once hatched. Count decay from whichever is later: the
  // last tick, or the moment it hatched out of the egg.
  const hatchMs = bornMs + STAGE_ONSET_DAYS.baby * MS_PER_DAY;
  const decayFromMs = Math.max(lastTickMs, hatchMs);
  const decayHours = Math.max(0, (nowMs - decayFromMs) / MS_PER_HOUR);

  let needs = decayNeeds(stats.needs, decayHours, stageMultiplier(stageAfter));

  const eventsApplied: TickChanges["eventsApplied"] = [];
  for (const event of events) {
    needs = applyEvent(needs, event, seed);
    eventsApplied.push({ type: event.type, arg: event.arg });
  }

  const health = computeHealth(
    { health: stats.health, ailingSince: stats.ailingSince },
    needs,
    stageAfter,
    now,
    config,
  );

  const nextState: Stats = {
    bornAt: stats.bornAt,
    lastTick: now.toISOString(),
    stage: stageAfter,
    health: health.health,
    needs,
    ailingSince: health.ailingSince,
  };

  const changes: TickChanges = {
    hoursElapsed,
    needsBefore: stats.needs,
    needsAfter: needs,
    eventsApplied,
    stageChange: stageBefore !== stageAfter ? { from: stageBefore, to: stageAfter } : null,
    healthChange:
      stats.health !== health.health
        ? { from: stats.health, to: health.health }
        : null,
    hatched: stageBefore === "egg" && stageAfter !== "egg",
    died: health.health === "dead",
    warning: health.warning,
  };

  return { state: nextState, changes };
}
