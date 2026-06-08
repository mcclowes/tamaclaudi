import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  rmSync,
} from "node:fs";
import {
  DEFAULT_CONFIG,
  type Config,
  type CreatureEvent,
  type Seed,
  type Stats,
} from "../types.js";
import { paths, historyFile, dateStamp, type CreaturePaths } from "./paths.js";

export class CreatureNotFoundError extends Error {
  constructor(dir: string) {
    super(`No creature found at ${dir}. Run \`tama init\` to lay an egg.`);
    this.name = "CreatureNotFoundError";
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function exists(p: CreaturePaths = paths()): boolean {
  return existsSync(p.seed) && existsSync(p.stats);
}

export function ensureDirs(p: CreaturePaths = paths()): void {
  mkdirSync(p.dir, { recursive: true });
  mkdirSync(p.historyDir, { recursive: true });
  // The creature's mind: where it builds real, usable artifacts it owns.
  mkdirSync(p.knowledgeDir, { recursive: true });
  mkdirSync(p.skillsDir, { recursive: true });
  mkdirSync(p.workshopDir, { recursive: true });
}

export function writeTickMd(text: string, p: CreaturePaths = paths()): void {
  writeFileSync(p.tickMd, text.endsWith("\n") ? text : text + "\n", "utf8");
}

export function readSeed(p: CreaturePaths = paths()): Seed {
  if (!existsSync(p.seed)) throw new CreatureNotFoundError(p.dir);
  return readJson<Seed>(p.seed);
}

export function writeSeed(seed: Seed, p: CreaturePaths = paths()): void {
  writeJson(p.seed, seed);
}

export function readStats(p: CreaturePaths = paths()): Stats {
  if (!existsSync(p.stats)) throw new CreatureNotFoundError(p.dir);
  return readJson<Stats>(p.stats);
}

export function writeStats(stats: Stats, p: CreaturePaths = paths()): void {
  writeJson(p.stats, stats);
}

export function readConfig(p: CreaturePaths = paths()): Config {
  if (!existsSync(p.config)) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...readJson<Partial<Config>>(p.config) };
}

export function writeConfig(config: Config, p: CreaturePaths = paths()): void {
  writeJson(p.config, config);
}

/** Append a user action to the inbox. */
export function appendEvent(event: CreatureEvent, p: CreaturePaths = paths()): void {
  appendFileSync(p.events, JSON.stringify(event) + "\n", "utf8");
}

export function readEvents(p: CreaturePaths = paths()): CreatureEvent[] {
  if (!existsSync(p.events)) return [];
  return readFileSync(p.events, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CreatureEvent);
}

/** Read every queued event and clear the inbox. The tick drains it. */
export function drainEvents(p: CreaturePaths = paths()): CreatureEvent[] {
  const events = readEvents(p);
  if (existsSync(p.events)) rmSync(p.events);
  return events;
}

export function writeFeed(text: string, p: CreaturePaths = paths()): void {
  writeFileSync(p.feed, text.endsWith("\n") ? text : text + "\n", "utf8");
}

export function readFeed(p: CreaturePaths = paths()): string {
  if (!existsSync(p.feed)) return "";
  return readFileSync(p.feed, "utf8");
}

export function writeClaudeMd(text: string, p: CreaturePaths = paths()): void {
  writeFileSync(p.claudeMd, text.endsWith("\n") ? text : text + "\n", "utf8");
}

export function appendHistory(
  entry: string,
  now: Date,
  p: CreaturePaths = paths(),
): void {
  const file = historyFile(dateStamp(now), p.dir);
  const header = existsSync(file) ? "" : `# ${dateStamp(now)}\n\n`;
  appendFileSync(file, header + entry.trimEnd() + "\n", "utf8");
}

export function readHistory(date: string, p: CreaturePaths = paths()): string | null {
  const file = historyFile(date, p.dir);
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8");
}
