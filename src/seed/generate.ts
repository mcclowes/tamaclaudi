import {
  TEMPERAMENT_AXES,
  type LoveLanguage,
  type Seed,
  type Temperament,
} from "../types.js";

/** mulberry32 — tiny, fast, fully deterministic given a seed. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function pickN<T>(rng: () => number, list: readonly T[], n: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

function int(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const NAMES = [
  "Pip", "Mochi", "Sprout", "Biscuit", "Nimbus", "Tulip", "Bramble", "Pepper",
  "Cosmo", "Waffle", "Juniper", "Pebble", "Marlow", "Fennel", "Cricket", "Otto",
];

const ASPIRATIONS = [
  "to become a great explorer",
  "to be the world's most beloved napper",
  "to write a book only it understands",
  "to map every star it can see from the window",
  "to be the bravest small thing in the house",
  "to make @mcclowes laugh every single day",
  "to learn one new useful skill a week",
  "to grow up gentle and unhurried",
];

const FOODS = [
  "berries", "kibble", "honey", "noodles", "toast", "broccoli", "fish",
  "mushrooms", "dumplings", "pickles", "cake", "porridge",
];
const GAMES = [
  "hide and seek", "fetch", "chess", "tag", "puzzles", "tug of war",
  "shadow puppets", "stacking blocks", "racing",
];
const TOPICS = [
  "space", "the sea", "old maps", "machines", "weather", "dreams", "music",
  "taxes", "gossip", "history", "tiny facts", "the future",
];
const QUIRKS = [
  "hiccups when excited",
  "afraid of the dark",
  "hoards shiny things",
  "narrates its own movements",
  "only sleeps in a perfect circle",
  "distrusts Tuesdays",
  "collects words it likes the sound of",
  "salutes the moon",
];
const LOVE_LANGUAGES: LoveLanguage[] = ["talk", "play", "feed"];

/**
 * Roll a personality. Deterministic: the same rngSeed always yields the same
 * creature, which is what the tests lean on. Born-time and name can be forced.
 */
export function generateSeed(opts: {
  rngSeed: number;
  name?: string;
  bornAt: string;
}): Seed {
  const rng = makeRng(opts.rngSeed);

  const temperament = {} as Temperament;
  for (const axis of TEMPERAMENT_AXES) temperament[axis] = int(rng, 5, 95);

  // Draw likes and dislikes from disjoint slices so they never overlap.
  const foods = pickN(rng, FOODS, 4);
  const games = pickN(rng, GAMES, 4);
  const topics = pickN(rng, TOPICS, 4);

  return {
    name: opts.name ?? pick(rng, NAMES),
    bornAt: opts.bornAt,
    temperament,
    aspiration: pick(rng, ASPIRATIONS),
    likes: {
      foods: foods.slice(0, 2),
      games: games.slice(0, 2),
      topics: topics.slice(0, 2),
    },
    dislikes: {
      foods: foods.slice(2, 3),
      games: games.slice(2, 3),
      topics: topics.slice(2, 3),
    },
    quirks: pickN(rng, QUIRKS, int(rng, 1, 2)),
    loveLanguage: pick(rng, LOVE_LANGUAGES),
    rngSeed: opts.rngSeed,
  };
}

/** A non-deterministic seed value for births that don't pin one. */
export function randomRngSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
