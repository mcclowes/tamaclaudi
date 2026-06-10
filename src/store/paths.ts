import { join, resolve } from "node:path";

/**
 * Where the creature lives on disk. Single creature, single path. Override with
 * TAMA_HOME to keep a pet somewhere other than ./creature (e.g. a real home dir).
 */
export function creatureDir(): string {
  return process.env.TAMA_HOME
    ? resolve(process.env.TAMA_HOME)
    : resolve(process.cwd(), "creature");
}

export interface CreaturePaths {
  dir: string;
  seed: string;
  stats: string;
  events: string;
  feed: string;
  claudeMd: string;
  tickMd: string;
  config: string;
  historyDir: string;
  proposals: string;
  questions: string;
  tasks: string;
  goals: string;
  /** Finished work the creature hands back for @mcclowes to use. */
  deliverables: string;
  /** What the creature deliberately carries forward across ticks. */
  memory: string;
  /** Achievements the creature has earned, by id → when. */
  achievements: string;
  /** Where the soul builds its mind — real artifacts it owns. */
  knowledgeDir: string;
  skillsDir: string;
  workshopDir: string;
}

export function paths(dir = creatureDir()): CreaturePaths {
  return {
    dir,
    seed: join(dir, "seed.json"),
    stats: join(dir, "stats.json"),
    events: join(dir, "events.jsonl"),
    feed: join(dir, "feed.md"),
    claudeMd: join(dir, "CLAUDE.md"),
    tickMd: join(dir, "TICK.md"),
    config: join(dir, "config.json"),
    historyDir: join(dir, "history"),
    proposals: join(dir, "proposals.json"),
    questions: join(dir, "questions.json"),
    tasks: join(dir, "tasks.json"),
    goals: join(dir, "goals.json"),
    deliverables: join(dir, "deliverables.json"),
    memory: join(dir, "memory.json"),
    achievements: join(dir, "achievements.json"),
    knowledgeDir: join(dir, "knowledge"),
    skillsDir: join(dir, "skills"),
    workshopDir: join(dir, "workshop"),
  };
}

export function historyFile(date: string, dir = creatureDir()): string {
  return join(dir, "history", `${date}.md`);
}

/** YYYY-MM-DD for a given date, in UTC. */
export function dateStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}
