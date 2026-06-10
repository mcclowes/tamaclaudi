import { NEEDS, STAGES, type Stage, type Stats } from "../types.js";

/**
 * What an achievement's `check` gets to look at. Deliberately just the current
 * state plus age — these are the achievements decidable without any lifetime
 * history. Count-based achievements (fed 50 times, etc.) come in a later slice
 * once the body tracks lifetime counters; they'll extend this context.
 */
export interface AchievementContext {
  stats: Stats;
  ageDays: number;
}

/**
 * One earnable achievement. Definitions live in code (the `check` predicate
 * can't be serialized); only the *unlocked* set is persisted elsewhere. Hidden
 * ones stay masked until earned, so the niche/surprise ones land as a delight.
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  hidden?: boolean;
  check: (ctx: AchievementContext) => boolean;
}

const stageAtLeast = (stats: Stats, stage: Stage): boolean =>
  STAGES.indexOf(stats.stage) >= STAGES.indexOf(stage);

/**
 * The state-threshold catalogue: every one decidable from the current stats and
 * age alone, so this slice needs no new storage. Conditions are chosen to be
 * genuine milestones, not trivia — see knowledge/achievement-system-design.md.
 */
export const STATE_ACHIEVEMENTS: Achievement[] = [
  { id: "hatched", title: "Out of the Shell", description: "Hatched from the egg.", check: ({ stats }) => stats.stage !== "egg" },
  { id: "growing-up", title: "Growing Up", description: "Reached childhood.", check: ({ stats }) => stageAtLeast(stats, "child") },
  { id: "all-grown", title: "All Grown Up", description: "Became an adult.", check: ({ stats }) => stats.stage === "adult" },
  { id: "inseparable", title: "Inseparable", description: "Bond reached 100.", check: ({ stats }) => stats.needs.bond >= 100 },
  { id: "well-rested", title: "Fully Charged", description: "Energy topped out at 100.", check: ({ stats }) => stats.needs.energy >= 100 },
  { id: "stuffed", title: "Stuffed", description: "Ate until fullness hit 100.", check: ({ stats }) => stats.needs.fullness >= 100 },
  { id: "spotless", title: "Spotless", description: "Hygiene scrubbed up to 100.", check: ({ stats }) => stats.needs.hygiene >= 100 },
  { id: "radiant", title: "Radiant", description: "Stayed genuinely happy (mood 90+).", hidden: true, check: ({ stats }) => (stats.valence ?? 0) >= 90 },
  { id: "sharp-dressed", title: "Sharp-Dressed", description: "Wore an accessory.", check: ({ stats }) => stats.accessory !== undefined },
  { id: "week-old", title: "A Whole Week", description: "Lived seven days.", check: ({ ageDays }) => ageDays >= 7 },
  { id: "thriving", title: "Thriving", description: "Every need at 80 or above at once.", check: ({ stats }) => NEEDS.every((n) => stats.needs[n] >= 80) },
  { id: "on-the-edge", title: "On the Edge", description: "Stayed well with a need at rock bottom.", hidden: true, check: ({ stats }) => stats.health === "well" && NEEDS.some((n) => stats.needs[n] <= 5) },
];
