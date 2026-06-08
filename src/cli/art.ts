import { NEEDS, type Stats } from "../types.js";

/**
 * The creature's face, drawn from how it's doing. The body never stores a
 * "mood" — we read one off the mechanical state so the art can't drift from
 * the truth in stats.json.
 */
export type Expression = "happy" | "content" | "neutral" | "sad" | "sleepy" | "sick" | "dead";

/** Eyes and mouth are each exactly 3 characters wide so the art stays aligned. */
const FACES: Record<Expression, { eyes: string; mouth: string }> = {
  happy: { eyes: "^ ^", mouth: " u " },
  content: { eyes: "o o", mouth: " u " },
  neutral: { eyes: "o o", mouth: " - " },
  sad: { eyes: ". .", mouth: " n " },
  sleepy: { eyes: "- -", mouth: " o " },
  sick: { eyes: "@ @", mouth: " ~ " },
  dead: { eyes: "x x", mouth: " _ " },
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

/** The two-line face core every post-egg stage is built around. */
function faceCore(expr: Expression): [string, string] {
  const f = FACES[expr];
  return [`( ${f.eyes} )`, `( ${f.mouth} )`];
}

/**
 * Each stage wraps the face core in a little more body — the egg is sealed, the
 * baby is bare, and they sprout feet, arms, and an antenna as they grow up.
 */
function bodyArt(stage: Stats["stage"], expr: Expression): string[] {
  const [eyes, mouth] = faceCore(expr);

  switch (stage) {
    case "egg":
      return expr === "dead"
        ? ["   .--.", "  / /\\ \\", " |  \\/  |", " | /\\   |", "  \\    /", "   '--'"]
        : ["   .--.", "  / .  \\", " |  .:  |", " | :.   |", "  \\  .  /", "   '--'"];
    case "baby":
      return ["  .-----.", `  ${eyes}`, `  ${mouth}`, "  '-----'"];
    case "child":
      return ["  .-----.", `  ${eyes}`, `  ${mouth}`, "  '--+--'", "   / \\"];
    case "teen":
      return ["  .-----.", `\\_${eyes}`, `  ${mouth}_/`, "  '-----'"];
    case "adult":
      return ["  \\ | /", "  .-----.", `  ${eyes}`, `  ${mouth}`, "  '-----'", "  /     \\"];
  }
}

/** The creature as ASCII art, chosen by its stage and current mood. */
export function creatureArt(stats: Stats): string {
  return bodyArt(stats.stage, expressionFor(stats)).join("\n");
}
