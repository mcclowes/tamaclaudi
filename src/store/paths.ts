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
  config: string;
  historyDir: string;
}

export function paths(dir = creatureDir()): CreaturePaths {
  return {
    dir,
    seed: join(dir, "seed.json"),
    stats: join(dir, "stats.json"),
    events: join(dir, "events.jsonl"),
    feed: join(dir, "feed.md"),
    claudeMd: join(dir, "CLAUDE.md"),
    config: join(dir, "config.json"),
    historyDir: join(dir, "history"),
  };
}

export function historyFile(date: string, dir = creatureDir()): string {
  return join(dir, "history", `${date}.md`);
}

/** YYYY-MM-DD for a given date, in UTC. */
export function dateStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}
