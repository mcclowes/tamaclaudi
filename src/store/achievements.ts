import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { paths, type CreaturePaths } from "./paths.js";

/** Persisted unlock record: achievement id → ISO timestamp it was first earned. */
export interface AchievementStore {
  unlocked: Record<string, string>;
}

const EMPTY: AchievementStore = { unlocked: {} };

export function readAchievements(p: CreaturePaths = paths()): AchievementStore {
  if (!existsSync(p.achievements)) return { unlocked: {} };
  const parsed = JSON.parse(readFileSync(p.achievements, "utf8")) as Partial<AchievementStore>;
  return { unlocked: parsed.unlocked ?? {} };
}

export function writeAchievements(store: AchievementStore, p: CreaturePaths = paths()): void {
  writeFileSync(p.achievements, JSON.stringify(store, null, 2) + "\n", "utf8");
}

/**
 * Record newly-earned ids at `now`, keeping the first-earned timestamp for any
 * already present (an achievement is earned once and stays earned). Writes only
 * when something actually changed, so a quiet tick touches no file. Returns the
 * updated store.
 */
export function recordUnlocks(
  ids: string[],
  now: Date,
  p: CreaturePaths = paths(),
): AchievementStore {
  const store = readAchievements(p);
  let changed = false;
  for (const id of ids) {
    if (!(id in store.unlocked)) {
      store.unlocked[id] = now.toISOString();
      changed = true;
    }
  }
  if (changed) writeAchievements(store, p);
  return store;
}
