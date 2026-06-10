import type { Achievement, AchievementContext } from "./defs.js";

/**
 * The pure heart of the achievement system: given the catalogue, the current
 * context, and the ids already earned, return the achievements newly met this
 * moment. No IO, no side effects — the caller persists the unlocks and decides
 * how to announce them.
 */
export function newlyUnlocked(
  defs: Achievement[],
  ctx: AchievementContext,
  unlockedIds: Iterable<string>,
): Achievement[] {
  const have = new Set(unlockedIds);
  return defs.filter((a) => !have.has(a.id) && a.check(ctx));
}
