import { NEEDS, type NeedName, type Needs, type Stage } from "../types.js";

export const NEED_MIN = 0;
export const NEED_MAX = 100;

export function clamp(n: number, min = NEED_MIN, max = NEED_MAX): number {
  return Math.min(max, Math.max(min, n));
}

/** Needs a freshly hatched creature starts life with. Comfortable but not maxed. */
export function startingNeeds(): Needs {
  return { fullness: 70, energy: 70, hygiene: 80, joy: 65, bond: 30 };
}

/**
 * Base decay per need, in points per hour, for a baseline creature. Scaled by
 * life stage (see stages.ts). Energy is special: it only falls with activity,
 * so its passive decay is gentle and play is what really drains it.
 */
export const BASE_DECAY_PER_HOUR: Needs = {
  fullness: 8,
  energy: 3,
  hygiene: 4,
  joy: 5,
  bond: 1.5,
};

export function decayNeeds(
  needs: Needs,
  hours: number,
  stageMultiplier: number,
): Needs {
  const next = { ...needs };
  for (const name of NEEDS) {
    const drop = BASE_DECAY_PER_HOUR[name] * stageMultiplier * hours;
    next[name] = clamp(next[name] - drop);
  }
  return next;
}

export function applyDelta(needs: Needs, name: NeedName, delta: number): Needs {
  return { ...needs, [name]: clamp(needs[name] + delta) };
}

/**
 * Energy a left-alone creature drifts back up to on quiet ticks. Set to the
 * starting "rested" energy (70) rather than lower, so the baseline sits inside
 * the band an active creature actually lives in. Too low and passive rest only
 * ever shows up once a creature is already run-down, which makes "I rested, why
 * am I still tired?" a fair complaint.
 */
export const RESTED_BASELINE = 70;
/** How fast energy recovers, in points per hour, on a tick with no play. */
export const REST_REGEN_PER_HOUR = 8;

/**
 * Energy is the one need none of the care actions refill, so without this a
 * creature would drain forever. On a quiet tick — no play — energy recovers
 * gently toward a rested baseline: being left in peace is restful. It never
 * climbs above the baseline on its own (an explicit `rest` is needed for a real
 * top-up), so passive recovery can't mask neglect by carrying a creature to full
 * energy while its other needs starve.
 */
export function passiveEnergyRegen(
  needs: Needs,
  hours: number,
  hadPlay: boolean,
): Needs {
  if (hadPlay || hours <= 0 || needs.energy >= RESTED_BASELINE) return needs;
  const recovered = Math.min(RESTED_BASELINE, needs.energy + REST_REGEN_PER_HOUR * hours);
  return { ...needs, energy: recovered };
}

/** A need is in the danger zone below this. Used by health.ts. */
export const DANGER_THRESHOLD = 15;

export function lowestNeed(needs: Needs): { name: NeedName; value: number } {
  let lowest: { name: NeedName; value: number } = {
    name: "fullness",
    value: Infinity,
  };
  for (const name of NEEDS) {
    if (needs[name] < lowest.value) lowest = { name, value: needs[name] };
  }
  return lowest;
}

export function anyInDanger(needs: Needs): boolean {
  return NEEDS.some((n) => needs[n] <= DANGER_THRESHOLD);
}

export type StageMultiplierLookup = (stage: Stage) => number;
