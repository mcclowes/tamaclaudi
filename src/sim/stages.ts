import { STAGES, type Stage } from "../types.js";

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Age in real days at which each stage begins. Tunable; these match the doc's
 * ~9-day arc to adulthood.
 */
export const STAGE_ONSET_DAYS: Record<Stage, number> = {
  egg: 0,
  baby: 0.5,
  child: 2,
  teen: 5,
  adult: 9,
};

/**
 * Decay multiplier per stage. A baby burns through needs and can't self-soothe;
 * an adult is steady and resilient. This is what makes the early days demanding.
 */
export const STAGE_DECAY_MULTIPLIER: Record<Stage, number> = {
  egg: 0, // an egg has no needs yet — it just waits to hatch
  baby: 2.2,
  child: 1.5,
  teen: 1.1,
  adult: 0.8,
};

export function ageDays(bornAt: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(bornAt).getTime()) / MS_PER_DAY);
}

export function stageForAge(days: number): Stage {
  let current: Stage = "egg";
  for (const stage of STAGES) {
    if (days >= STAGE_ONSET_DAYS[stage]) current = stage;
  }
  return current;
}

export function stageMultiplier(stage: Stage): number {
  return STAGE_DECAY_MULTIPLIER[stage];
}

/** Stages in birth order, for detecting forward transitions. */
export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}
