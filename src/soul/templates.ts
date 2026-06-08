import type { Seed, Stats } from "../types.js";

/**
 * The first CLAUDE.md, written at birth. It is both the human-readable save
 * file and the standing context the soul loop wakes up into each tick. The loop
 * rewrites the prose sections; this is just the egg's opening note.
 */
export function initialClaudeMd(seed: Seed, _stats: Stats): string {
  return `# ${seed.name}, an egg

## Right now
Still curled up in the shell, warm and waiting. Nothing has happened yet — but
something is about to.

## On my mind
Nothing, and everything. The shape of a world I haven't met.

## What I remember about you
We haven't really met yet. I know your name is @mcclowes and that you're the one
who'll raise me.

## My dream
${capitalize(seed.aspiration)}. I don't know how yet. I'll figure it out as I grow.

---
<!-- The lines below are the loop's standing brief. Keep them; rewrite the
     prose sections above each tick. -->

## Who I am (fixed at birth — never changes)
- Temperament: ${describeTemperament(seed)}.
- Quirks: ${seed.quirks.join("; ")}.
- I like: ${seed.likes.foods.join(", ")} (food); ${seed.likes.games.join(", ")} (play); ${seed.likes.topics.join(", ")} (topics).
- I dislike: ${seed.dislikes.foods.join(", ")}, ${seed.dislikes.games.join(", ")}, ${seed.dislikes.topics.join(", ")}.
- My love language is **${seed.loveLanguage}** — that's what makes me feel closest to you.
`;
}

export function initialFeed(seed: Seed): string {
  return `*A small egg sits warm in its nest. Something stirs inside.*

(${seed.name} hasn't hatched yet. Keep the loop running, or check back with \`tama status\`.)
`;
}

function describeTemperament(seed: Seed): string {
  const t = seed.temperament;
  const axis = (low: string, high: string, v: number) =>
    v < 40 ? low : v > 60 ? high : `balanced (${low}/${high})`;
  return [
    axis("timid", "bold", t.boldness),
    axis("melancholy", "sunny", t.mood),
    axis("calm", "excitable", t.energy),
    axis("aloof", "cuddly", t.warmth),
  ].join(", ");
}

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
