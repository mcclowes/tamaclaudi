import {
  STAGES,
  type Config,
  type CreatureEvent,
  type Health,
  type Needs,
  type Seed,
  type Stage,
  type Stats,
} from "../types.js";
import { decayNeeds, passiveEnergyRegen } from "./stats.js";
import { smoothValence, wellbeing } from "./valence.js";
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

/**
 * Decay needs across `[fromMs, toMs)`, splitting the span at each stage onset
 * so every slice decays at its own stage's rate. A single multiplier for the
 * whole gap would, e.g., decay a child->teen span entirely at the gentler teen
 * rate, under-counting the demanding child hours.
 */
function decayAcrossStages(
  needs: Needs,
  bornAt: string,
  fromMs: number,
  toMs: number,
): Needs {
  const bornMs = new Date(bornAt).getTime();
  const boundaries = STAGES.map((s) => bornMs + STAGE_ONSET_DAYS[s] * MS_PER_DAY)
    .filter((t) => t > fromMs && t < toMs)
    .sort((a, b) => a - b);

  let cursor = fromMs;
  let current = needs;
  for (const edge of [...boundaries, toMs]) {
    const hours = (edge - cursor) / MS_PER_HOUR;
    const stage = stageForAge(ageDays(bornAt, new Date(cursor)));
    current = decayNeeds(current, hours, stageMultiplier(stage));
    cursor = edge;
  }
  return current;
}

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
  valenceBefore: number;
  valenceAfter: number;
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
    valenceBefore: stats.valence ?? wellbeing(stats.needs),
    valenceAfter: stats.valence ?? wellbeing(stats.needs),
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

  let needs =
    nowMs > decayFromMs
      ? decayAcrossStages(stats.needs, stats.bornAt, decayFromMs, nowMs)
      : stats.needs;

  const eventsApplied: TickChanges["eventsApplied"] = [];
  for (const event of events) {
    needs = applyEvent(needs, event, seed);
    eventsApplied.push({ type: event.type, arg: event.arg });
  }

  // Energy is the one need the care actions can't refill, so a quiet tick — one
  // with no play — lets it drift back up toward a rested baseline. Measured over
  // the same post-hatch window as decay so an egg never "rests".
  const hadPlay = events.some((e) => e.type === "play");
  const restHours = Math.max(0, (nowMs - decayFromMs) / MS_PER_HOUR);
  needs = passiveEnergyRegen(needs, restHours, hadPlay);

  const health = computeHealth(
    { health: stats.health, ailingSince: stats.ailingSince },
    needs,
    stageAfter,
    now,
    config,
  );

  // Mood lags the body: valence chases the mean of the post-tick needs slowly,
  // so a good meal still warms the feeling several ticks later. Computed over
  // the elapsed window; a fresh creature with no prior valence starts at its
  // current wellbeing (no lag to inherit yet).
  const valence = smoothValence(stats.valence, wellbeing(needs), hoursElapsed);

  // Spread the prior stats first so any field the sim doesn't model — cosmetic
  // accessories, and anything added later — survives the tick instead of being
  // silently dropped. The computed fields below then override what did change.
  const nextState: Stats = {
    ...stats,
    lastTick: now.toISOString(),
    stage: stageAfter,
    health: health.health,
    needs,
    ailingSince: health.ailingSince,
    valence,
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
    valenceBefore: stats.valence ?? wellbeing(stats.needs),
    valenceAfter: valence,
  };

  return { state: nextState, changes };
}
