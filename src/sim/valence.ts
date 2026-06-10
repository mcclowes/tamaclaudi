import { NEEDS, type Needs } from "../types.js";
import { clamp } from "./stats.js";

/**
 * How quickly valence chases the needs, as a time constant in hours. Larger
 * means more inertia: at ~6h a good meal still warms the mood an hour later and
 * a rough patch lingers, instead of mood snapping to whatever the numbers say
 * this instant. This is the whole point of valence — momentum the soul can't fake.
 */
export const VALENCE_TAU_HOURS = 6;

/** The instantaneous "how good is life right now" signal: the mean of the needs. */
export function wellbeing(needs: Needs): number {
  const sum = NEEDS.reduce((acc, n) => acc + needs[n], 0);
  return sum / NEEDS.length;
}

/**
 * Valence is a smoothed wellbeing scalar (0–100) that lags the needs, giving
 * mood real momentum: each tick it moves a fraction of the way toward the
 * current wellbeing by exponential smoothing over the elapsed hours, rather
 * than re-deriving the feeling from scratch. A fresh creature (prev undefined)
 * starts already at its wellbeing — there is nothing to lag from yet.
 */
export function smoothValence(
  prev: number | undefined,
  target: number,
  hours: number,
): number {
  if (prev === undefined) return clamp(target);
  if (hours <= 0) return clamp(prev);
  const alpha = 1 - Math.exp(-hours / VALENCE_TAU_HOURS);
  return clamp(prev + (target - prev) * alpha);
}
