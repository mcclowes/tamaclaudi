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

export type EventType = "feed" | "play" | "clean" | "talk";

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

/** A genuine question the creature has for you, and your eventual answer. */
export interface Question {
  id: string;
  at: string; // ISO
  text: string;
  answer?: string;
  answeredAt?: string; // ISO
}

export interface Config {
  /** When true, sustained neglect can actually kill. Default false (forgiving). */
  realStakes: boolean;
}

export const DEFAULT_CONFIG: Config = { realStakes: false };
