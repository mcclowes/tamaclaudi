import { NEEDS, type Accessory, type Stats } from "../types.js";

/**
 * The creature's face, drawn from how it's doing. The body never stores a
 * "mood" — we read one off the mechanical state so the art can't drift from
 * the truth in stats.json.
 */
export type Expression = "happy" | "content" | "neutral" | "sad" | "sleepy" | "sick" | "dead";

/**
 * Eyes and mouth are each exactly 5 characters wide so the art stays aligned in
 * the bigger rounded body below. The wider face leaves room for real detail —
 * a proper grin, droopy lids, a queasy wobble.
 */
const FACES: Record<Expression, { eyes: string; mouth: string }> = {
  happy: { eyes: "^   ^", mouth: "\\___/" },
  content: { eyes: "o   o", mouth: " \\_/ " },
  neutral: { eyes: "o   o", mouth: " --- " },
  sad: { eyes: "u   u", mouth: " /^\\ " },
  sleepy: { eyes: "-   -", mouth: " ~~~ " },
  sick: { eyes: "@   @", mouth: " mmm " },
  dead: { eyes: "x   x", mouth: " ___ " },
};

function mean(stats: Stats): number {
  return NEEDS.reduce((sum, n) => sum + stats.needs[n], 0) / NEEDS.length;
}

/** Pick a face from health first, then from how well its needs are met. */
export function expressionFor(stats: Stats): Expression {
  if (stats.health === "dead") return "dead";
  if (stats.health === "sick") return "sick";

  const avg = mean(stats);
  if (stats.needs.energy < 20) return "sleepy";
  if (stats.needs.joy < 25 || avg < 25) return "sad";
  if (stats.needs.joy >= 70 && avg >= 60) return "happy";
  if (avg >= 45) return "content";
  return "neutral";
}

/**
 * The rounded body every post-egg stage shares: a domed head, an eyes row, a
 * mouth row, and a chin. Each line is built on the 11-wide body so stages can
 * hang feet under it and arms off its sides without the columns drifting.
 */
function roundBody(expr: Expression): string[] {
  const f = FACES[expr];
  return [
    "  .---------.",
    `  |  ${f.eyes}  |`,
    `  |  ${f.mouth}  |`,
    "  '---------'",
  ];
}

/**
 * Each stage wraps that body in a little more of itself — the egg is sealed and
 * featureless, the baby is just a face, and they sprout feet, then arms, then a
 * sensing antenna as they grow up.
 */
function bodyArt(stage: Stats["stage"], expr: Expression): string[] {
  const [top, eyes, mouth, bottom] = roundBody(expr);

  switch (stage) {
    case "egg":
      return expr === "dead"
        ? ["    .-----.", "   / x   x \\", "  | cracked |", "  |  . open |", "   \\   .   /", "    '-----'"]
        : ["    .-----.", "   /  . :  \\", "  |  :   .  |", "  |   . :   |", "   \\  :.   /", "    '-----'"];
    case "baby":
      // Bare and small: just the face, no limbs to coordinate yet.
      return [top!, eyes!, mouth!, bottom!];
    case "child":
      // Stands on its own two feet.
      return [top!, eyes!, mouth!, bottom!, "    _/   \\_"];
    case "teen":
      // Arms out, testing its reach; feet planted.
      return [top!, eyes!, `\\_${mouth!.trimStart()}_/`, bottom!, "    /   \\"];
    case "adult":
      // A sensing antenna up top, arms, and a steady stance.
      return ["      \\|/", "       o", top!, eyes!, `\\_${mouth!.trimStart()}_/`, bottom!, "    _/   \\_"];
  }
}

/**
 * A worn accessory, drawn to sit centred on the 11-wide head. Returns the lines
 * to stack directly above the domed head.
 */
const ACCESSORY_ART: Record<Accessory, string[]> = {
  hat: ["     .---.", "   __|   |__"],
};

/**
 * The creature as ASCII art, chosen by its stage and current mood. A cosmetic
 * accessory perches on the head — but only on a hatched, living creature; an
 * egg has nowhere to put a hat.
 */
export function creatureArt(stats: Stats): string {
  const expr = expressionFor(stats);
  const lines = bodyArt(stats.stage, expr);
  if (stats.accessory && stats.stage !== "egg" && expr !== "dead") {
    return [...ACCESSORY_ART[stats.accessory], ...lines].join("\n");
  }
  return lines.join("\n");
}
