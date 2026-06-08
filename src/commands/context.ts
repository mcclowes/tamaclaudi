import { paths, type CreaturePaths } from "../store/paths.js";

/** Everything a command needs from the outside world, injectable for tests. */
export interface CommandContext {
  now: Date;
  p: CreaturePaths;
}

export function defaultContext(now: Date = new Date()): CommandContext {
  return { now, p: paths() };
}
