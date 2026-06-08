import type { Config, Health, Needs, Stage } from "../types.js";
import { anyInDanger, lowestNeed } from "./stats.js";

/** Hours in the danger zone before the creature falls sick. */
export const SICK_AFTER_HOURS = 12;
/**
 * Hours in the danger zone before sustained neglect turns fatal. Only ever
 * applies when realStakes is on — forgiving mode (the default) can't kill.
 */
export const DEATH_AFTER_HOURS = 36;

const MS_PER_HOUR = 60 * 60 * 1000;

export interface HealthInput {
  health: Health;
  ailingSince: string | null;
}

export interface HealthResult {
  health: Health;
  ailingSince: string | null;
  /** A human-facing warning when things are sliding, for the feed/diff. */
  warning: string | null;
}

function hoursBetween(fromIso: string, now: Date): number {
  return (now.getTime() - new Date(fromIso).getTime()) / MS_PER_HOUR;
}

/**
 * Pure health transition. Forgiving by design: needs must sit in the danger
 * zone for many hours before sickness, recovery is instant once you tend to
 * the creature, and death is impossible unless realStakes is enabled.
 */
export function computeHealth(
  prev: HealthInput,
  needs: Needs,
  stage: Stage,
  now: Date,
  config: Config,
): HealthResult {
  if (prev.health === "dead") {
    return { health: "dead", ailingSince: prev.ailingSince, warning: null };
  }

  // An egg is safe in its shell; nothing decays yet.
  if (stage === "egg") {
    return { health: "well", ailingSince: null, warning: null };
  }

  const inDanger = anyInDanger(needs);

  if (!inDanger) {
    // Comfortable again — recover fully and clear the timer.
    return { health: "well", ailingSince: null, warning: null };
  }

  // In the danger zone. Start or continue the ailing timer.
  const ailingSince = prev.ailingSince ?? now.toISOString();
  const ailingHours = hoursBetween(ailingSince, now);
  const low = lowestNeed(needs);

  if (config.realStakes && ailingHours >= DEATH_AFTER_HOURS) {
    return {
      health: "dead",
      ailingSince,
      warning: `${low.name} has been critical for too long. The creature has died.`,
    };
  }

  if (ailingHours >= SICK_AFTER_HOURS) {
    return {
      health: "sick",
      ailingSince,
      warning: `Sick from neglected ${low.name} (${Math.round(low.value)}). Tend to it soon.`,
    };
  }

  return {
    health: "well",
    ailingSince,
    warning: `${low.name} is dangerously low (${Math.round(low.value)}).`,
  };
}
