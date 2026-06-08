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
  const base = BASE_EFFECTS[event.type];
  const { likes, dislikes } = likeFor(event.type, seed);
  const primary = primaryNeed(event.type);

  // Accumulate every adjustment into one delta per need, then clamp exactly
  // once. Clamping each step separately lets an intermediate cap swallow more
  // than the intended penalty when a need is already near 0 or 100.
  const delta: Partial<Record<keyof Needs, number>> = { ...base };
  const add = (name: keyof Needs, d: number) => {
    delta[name] = (delta[name] ?? 0) + d;
  };

  if (matchesList(event.arg, likes)) {
    add(primary, LIKE_BONUS);
    add("joy", 6);
  } else if (matchesList(event.arg, dislikes)) {
    add(primary, -Math.round((base[primary] ?? 0) / 2));
    add("joy", -8);
  }

  if (event.type === seed.loveLanguage) {
    add("bond", LOVE_LANGUAGE_BONUS);
  }

  let next = { ...needs };
  for (const [name, d] of Object.entries(delta)) {
    next = applyDelta(next, name as keyof Needs, d as number);
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
