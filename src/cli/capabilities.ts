import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";

export interface Capability {
  /** The skill file, e.g. launch-a-small-project.md — what to point @mcclowes at. */
  file: string;
  /** Human title, from the first heading. */
  name: string;
  /** One-line "when to use", if the skill declares one. */
  when?: string;
}

const HEADING = /^#+\s*(?:skill:\s*)?(.+?)\s*$/i;
const WHEN = /\*\*when to use:?\*\*\s*(.*)$/i;

/** Parse a single skill markdown file into a capability. Pure, so it's testable. */
export function parseCapability(file: string, markdown: string): Capability {
  const lines = markdown.split("\n");

  let name = file.replace(/\.md$/, "");
  for (const line of lines) {
    const m = line.match(HEADING);
    if (m && m[1]!.trim()) {
      name = m[1]!.trim();
      break;
    }
  }

  let when: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(WHEN);
    if (m) {
      // The summary may sit on the same line as the label, or wrap to the next.
      when = (m[1]!.trim() || nextNonEmpty(lines, i + 1) || "").replace(/\s+/g, " ");
      break;
    }
  }

  return { file, name, when: when || undefined };
}

function nextNonEmpty(lines: string[], from: number): string | undefined {
  for (let i = from; i < lines.length; i++) {
    if (lines[i]!.trim()) return lines[i]!.trim();
  }
  return undefined;
}

/** Read every skill in the pen and parse it into a capability. */
export function readCapabilities(p: CreaturePaths = paths()): Capability[] {
  if (!existsSync(p.skillsDir)) return [];
  return readdirSync(p.skillsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parseCapability(f, readFileSync(join(p.skillsDir, f), "utf8")));
}
