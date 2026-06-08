import type { CreatureEvent, EventType, Needs, Seed } from "../types.js";
import { applyDelta } from "./stats.js";

/** Base need changes for each action, before seed-driven bonuses. */
const BASE_EFFECTS: Record<EventType, Partial<Needs>> = {
  feed: { fullness: 35, joy: 4 },
  play: { joy: 30, energy: -15, bond: 5 },
  clean: { hygiene: 40 },
  talk: { bond: 18, joy: 6 },
};

/** Extra boost when an action hits one of the creature's likes. */
const LIKE_BONUS = 15;
/** Extra bond when the action matches the creature's love language. */
const LOVE_LANGUAGE_BONUS = 10;

function matchesList(arg: string | undefined, list: string[]): boolean {
  if (!arg) return false;
  const a = arg.toLowerCase();
  return list.some((item) => {
    const i = item.toLowerCase();
    return a === i || a.includes(i) || i.includes(a);
  });
}

function likeFor(type: EventType, seed: Seed) {
  if (type === "feed") return { likes: seed.likes.foods, dislikes: seed.dislikes.foods };
  if (type === "play") return { likes: seed.likes.games, dislikes: seed.dislikes.games };
  if (type === "talk") return { likes: seed.likes.topics, dislikes: seed.dislikes.topics };
  return { likes: [] as string[], dislikes: [] as string[] };
}

/**
 * Apply one queued action to the needs, filtered through the seed: favourites
 * give a bigger boost and a touch of extra joy, dislikes give less and a sulk.
 * Pure — returns fresh needs.
 */
export function applyEvent(needs: Needs, event: CreatureEvent, seed: Seed): Needs {
  let next = { ...needs };

  const base = BASE_EFFECTS[event.type];
  for (const [name, delta] of Object.entries(base)) {
    next = applyDelta(next, name as keyof Needs, delta as number);
  }

  const { likes, dislikes } = likeFor(event.type, seed);
  const primary = primaryNeed(event.type);

  if (matchesList(event.arg, likes)) {
    next = applyDelta(next, primary, LIKE_BONUS);
    next = applyDelta(next, "joy", 6);
  } else if (matchesList(event.arg, dislikes)) {
    next = applyDelta(next, primary, -Math.round((base[primary] ?? 0) / 2));
    next = applyDelta(next, "joy", -8);
  }

  if (event.type === seed.loveLanguage) {
    next = applyDelta(next, "bond", LOVE_LANGUAGE_BONUS);
  }

  return next;
}

function primaryNeed(type: EventType): keyof Needs {
  switch (type) {
    case "feed":
      return "fullness";
    case "play":
      return "joy";
    case "clean":
      return "hygiene";
    case "talk":
      return "bond";
  }
}
