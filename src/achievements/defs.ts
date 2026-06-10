import { NEEDS, STAGES, type Stage, type Stats } from "../types.js";
import { emptyCounters, type LifetimeCounters } from "../store/counters.js";

/**
 * What an achievement's `check` gets to look at: the current state, age, and the
 * lifetime counters. Counters are optional so state-threshold checks (and their
 * tests) don't have to supply them; count-based checks read through `countersOf`
 * which falls back to zeroes.
 */
export interface AchievementContext {
  stats: Stats;
  ageDays: number;
  counters?: LifetimeCounters;
}

const countersOf = (ctx: AchievementContext): LifetimeCounters => ctx.counters ?? emptyCounters();

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
  { id: "teen-spirit", title: "Teen Spirit", description: "Reached the teenage years.", check: ({ stats }) => stats.stage === "teen" },
  { id: "fortnight", title: "A Fortnight", description: "Lived two weeks.", check: ({ ageDays }) => ageDays >= 14 },
  { id: "month-old", title: "A Month Old", description: "Lived thirty days.", check: ({ ageDays }) => ageDays >= 30 },
  { id: "picture-of-health", title: "Picture of Health", description: "Every need at 90 or above, in good health.", check: ({ stats }) => stats.health === "well" && NEEDS.every((n) => stats.needs[n] >= 90) },
  { id: "content", title: "Content", description: "Settled into a steady, happy mood (70+).", check: ({ stats }) => (stats.valence ?? 0) >= 70 },
  { id: "feeling-blue", title: "Feeling Blue", description: "Weathered a properly low mood.", hidden: true, check: ({ stats }) => (stats.valence ?? 100) <= 25 },
  { id: "day-old", title: "A Day Old", description: "Lived a whole day.", check: ({ ageDays }) => ageDays >= 1 },
  { id: "glowing", title: "Glowing", description: "Mood up at a bright 85+.", check: ({ stats }) => (stats.valence ?? 0) >= 85 },
  { id: "grown-and-glad", title: "Grown & Glad", description: "Reached adulthood in a happy mood (70+).", check: ({ stats }) => stats.stage === "adult" && (stats.valence ?? 0) >= 70 },
];

/**
 * The count-based catalogue: earned by *how much* has happened over a lifetime,
 * which only the counters store can answer. Read through `countersOf` so a
 * context without counters simply hasn't reached any of these yet.
 */
export const COUNT_ACHIEVEMENTS: Achievement[] = [
  { id: "well-fed", title: "Well-Fed", description: "Fed 50 times.", check: (c) => countersOf(c).feed >= 50 },
  { id: "playful", title: "Playful", description: "Played 50 times.", check: (c) => countersOf(c).play >= 50 },
  { id: "chatterbox", title: "Chatterbox", description: "Talked to 100 times.", check: (c) => countersOf(c).talk >= 100 },
  { id: "clean-freak", title: "Clean Freak", description: "Cleaned 25 times.", check: (c) => countersOf(c).clean >= 25 },
  { id: "nap-champion", title: "Nap Champion", description: "Rested 25 times.", check: (c) => countersOf(c).rest >= 25 },
  { id: "seasoned", title: "Seasoned", description: "Lived 1000 ticks.", check: (c) => countersOf(c).ticks >= 1000 },
  { id: "gourmand", title: "Gourmand", description: "Fed 200 times.", check: (c) => countersOf(c).feed >= 200 },
  { id: "playmate", title: "Playmate", description: "Played 200 times.", check: (c) => countersOf(c).play >= 200 },
  { id: "confidant", title: "Confidant", description: "Talked to 500 times.", check: (c) => countersOf(c).talk >= 500 },
  { id: "immaculate", title: "Immaculate", description: "Cleaned 100 times.", check: (c) => countersOf(c).clean >= 100 },
  { id: "well-slept", title: "Well-Slept", description: "Rested 100 times.", check: (c) => countersOf(c).rest >= 100 },
  { id: "ancient-one", title: "Ancient One", description: "Lived 10,000 ticks.", check: (c) => countersOf(c).ticks >= 10000 },
  { id: "centurion", title: "Centurion", description: "Lived 100 ticks.", check: (c) => countersOf(c).ticks >= 100 },
  { id: "marathon", title: "Marathon", description: "Lived 5,000 ticks.", check: (c) => countersOf(c).ticks >= 5000 },
  { id: "play-buddy", title: "Play Buddy", description: "Played 100 times.", check: (c) => countersOf(c).play >= 100 },
  { id: "social-butterfly", title: "Social Butterfly", description: "Talked to 250 times.", check: (c) => countersOf(c).talk >= 250 },
  { id: "groomed", title: "Well-Groomed", description: "Cleaned 50 times.", check: (c) => countersOf(c).clean >= 50 },
  { id: "rested-soul", title: "Rested Soul", description: "Rested 50 times.", check: (c) => countersOf(c).rest >= 50 },
  { id: "devoted", title: "Devoted", description: "Fed 500 times.", check: (c) => countersOf(c).feed >= 500 },
  { id: "steady-hand", title: "Steady Hand", description: "Kept every need comfortable for 10 ticks straight.", check: (c) => countersOf(c).bestCareStreak >= 10 },
  { id: "devoted-care", title: "Devoted Care", description: "A 50-tick streak with no need neglected.", check: (c) => countersOf(c).bestCareStreak >= 50 },
  { id: "unbroken", title: "Unbroken", description: "A 200-tick streak of unbroken comfort.", check: (c) => countersOf(c).bestCareStreak >= 200 },
];

/** The whole catalogue — what the tick evaluates and the view lists. */
export const ALL_ACHIEVEMENTS: Achievement[] = [...STATE_ACHIEVEMENTS, ...COUNT_ACHIEVEMENTS];
