/**
 * Shared shapes for the body. The soul layer (Claude Code) reads these as JSON
 * but never writes them — Node owns every value here.
 */

export const NEEDS = ["fullness", "energy", "hygiene", "joy", "bond"] as const;
export type NeedName = (typeof NEEDS)[number];

/** Each need is 0–100. 0 is dire, 100 is sated. */
export type Needs = Record<NeedName, number>;

export const STAGES = ["egg", "baby", "child", "teen", "adult"] as const;
export type Stage = (typeof STAGES)[number];

export const HEALTHS = ["well", "sick", "dead"] as const;
export type Health = (typeof HEALTHS)[number];

/** The full mechanical state. Persisted as stats.json. */
export interface Stats {
  bornAt: string; // ISO
  lastTick: string; // ISO
  stage: Stage;
  health: Health;
  needs: Needs;
  /**
   * ISO timestamp of when needs first crossed into the danger zone, or null
   * when the creature is comfortable. Drives the slow slide into sickness.
   */
  ailingSince: string | null;
}

export const TEMPERAMENT_AXES = [
  "boldness", // timid 0 .. bold 100
  "mood", // melancholy 0 .. sunny 100
  "energy", // calm 0 .. excitable 100
  "warmth", // aloof 0 .. cuddly 100
] as const;
export type TemperamentAxis = (typeof TEMPERAMENT_AXES)[number];
export type Temperament = Record<TemperamentAxis, number>;

export type LoveLanguage = "talk" | "play" | "feed";

/** Rolled once at birth, immutable. Persisted as seed.json. */
export interface Seed {
  name: string;
  bornAt: string; // ISO
  temperament: Temperament;
  aspiration: string;
  likes: { foods: string[]; games: string[]; topics: string[] };
  dislikes: { foods: string[]; games: string[]; topics: string[] };
  quirks: string[];
  loveLanguage: LoveLanguage;
  /** The numeric seed used to roll this creature, kept for reproducibility. */
  rngSeed: number;
}

export type EventType = "feed" | "play" | "clean" | "talk" | "rest";

/** One user action, appended to events.jsonl, drained on the next tick. */
export interface CreatureEvent {
  at: string; // ISO
  type: EventType;
  /** food name, game name, or the words spoken. */
  arg?: string;
}

export type ProposalStatus = "pending" | "approved" | "denied" | "done";

/**
 * An action the creature wants to take *outside* its own creature/ pen. It does
 * nothing until @mcclowes approves it; the loop then runs it and records the
 * result. This is the whole "acts independently, with approval" contract.
 */
export interface Proposal {
  id: string;
  at: string; // ISO
  action: string; // plain-language what it wants to do
  why?: string; // why it thinks this helps
  command?: string; // the exact command/plan it would run, if any
  status: ProposalStatus;
  result?: string; // filled in by the loop once executed
}

export type TaskStatus = "open" | "working" | "done";

/**
 * A problem @mcclowes hands the creature to work on. Unlike a one-off `talk`,
 * a task is a standing goal the soul pursues across ticks — building in its
 * pen and proposing external actions as needed — until it's done.
 */
export interface Task {
  id: string;
  at: string; // ISO
  text: string;
  status: TaskStatus;
  notes: { at: string; text: string }[];
  outcome?: string;
}

/**
 * Where a self-formed goal came from. The creature's own wants arise three ways:
 * - `reactive` — in response to something that happened to its body (a need
 *   crashed, it was neglected, a stage or health change, something you did).
 * - `owner` — its own read on what would genuinely help @mcclowes, inferred
 *   rather than handed to it. (A handed problem is a `Task`, not a goal.)
 * - `organic` — from its own nature: temperament, curiosity, or a step toward
 *   the aspiration in its seed.
 */
export const GOAL_ORIGINS = ["reactive", "owner", "organic"] as const;
export type GoalOrigin = (typeof GOAL_ORIGINS)[number];

export type GoalStatus = "active" | "fulfilled" | "abandoned";

/**
 * A goal the creature sets for *itself* — distinct from a `Task`, which
 * @mcclowes hands it. Goals form, get pursued across ticks, and may be
 * fulfilled or, unlike tasks, gracefully abandoned when they stop fitting who
 * the creature is becoming. The soul files and tends these; @mcclowes only
 * watches (`tama goals`) what their creature wants.
 */
export interface Goal {
  id: string;
  at: string; // ISO, when the goal formed
  text: string; // what it wants
  origin: GoalOrigin;
  /** The specific thing that sparked it, in its words ("you were away 9 hours"). */
  spark?: string;
  status: GoalStatus;
  notes: { at: string; text: string }[];
  /** How it resolved, set when fulfilled or abandoned. */
  outcome?: string;
}

/** A genuine question the creature has for you, and your eventual answer. */
export interface Question {
  id: string;
  at: string; // ISO
  text: string;
  answer?: string;
  answeredAt?: string; // ISO
}

export type DeliverableStatus = "ready" | "accepted" | "shelved";

/**
 * A finished piece of work the creature hands back for @mcclowes to actually
 * use. Distinct from a `Proposal` (which asks permission to *act* outside the
 * pen): a deliverable is real output built inside the pen — a playbook, a patch,
 * a press kit — offered as something you can pick up. The soul files it ready;
 * @mcclowes accepts it (`tama take`) or shelves it (`tama shelve`).
 */
export interface Deliverable {
  id: string;
  at: string; // ISO
  title: string;
  summary?: string;
  /** Pointer to the artifact in the pen, e.g. workshop/launch-kit.md. */
  path?: string;
  status: DeliverableStatus;
  /** How @mcclowes resolved it, set on take/shelve. */
  outcome?: string;
}

/** One durable thing the creature chooses to carry forward across ticks. */
export interface MemoryBeat {
  at: string; // ISO
  text: string;
}

/**
 * The creature's working memory: a standing mood plus a bounded list of beats
 * it deliberately remembers. The body owns the store (every write goes through
 * a `tama` command), but the soul chooses what is worth remembering — the mood
 * is psyche, the beats are the creature's own picks. Surfaced in every tick diff
 * so the loop carries its past without re-reading flat files each time.
 */
export interface Memory {
  /** A short standing feeling the soul maintains, e.g. "quietly proud, a bit tired". */
  mood: string;
  moodSetAt: string | null; // ISO
  beats: MemoryBeat[];
}

/** How many beats we keep — old ones fall off so memory (and tokens) stay bounded. */
export const MEMORY_BEATS_KEPT = 12;

export const DEFAULT_MEMORY: Memory = { mood: "", moodSetAt: null, beats: [] };

export interface Config {
  /** When true, sustained neglect can actually kill. Default false (forgiving). */
  realStakes: boolean;
}

export const DEFAULT_CONFIG: Config = { realStakes: false };
