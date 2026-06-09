import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "../store/paths.js";
import { parseCapability, readCapabilities } from "./capabilities.js";

describe("parseCapability", () => {
  it("pulls the name from the first heading, stripping a Skill: prefix", () => {
    const cap = parseCapability("launch.md", "# Skill: launch a small project\n\nbody");
    expect(cap.name).toBe("launch a small project");
  });

  it("captures the 'When to use' line as the summary", () => {
    const cap = parseCapability(
      "x.md",
      "# Do the thing\n\n**When to use:** a project is good but invisible.\n",
    );
    expect(cap.when).toBe("a project is good but invisible.");
  });

  it("reads the summary from the next line when the label stands alone", () => {
    const cap = parseCapability("x.md", "# Title\n\n**When to use:**\nright after a launch.\n");
    expect(cap.when).toBe("right after a launch.");
  });

  it("falls back to the filename when there's no heading", () => {
    const cap = parseCapability("honest-testing.md", "no heading here");
    expect(cap.name).toBe("honest-testing");
    expect(cap.when).toBeUndefined();
  });
});

describe("readCapabilities", () => {
  let dir: string;
  let p: CreaturePaths;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "tama-"));
    p = paths(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns [] when there's no skills dir", () => {
    expect(readCapabilities(p)).toEqual([]);
  });

  it("reads and sorts every .md skill, ignoring other files", () => {
    mkdirSync(p.skillsDir, { recursive: true });
    writeFileSync(join(p.skillsDir, "b.md"), "# Beta\n**When to use:** later.");
    writeFileSync(join(p.skillsDir, "a.md"), "# Alpha\n**When to use:** first.");
    writeFileSync(join(p.skillsDir, "notes.txt"), "ignore me");
    const caps = readCapabilities(p);
    expect(caps.map((c) => c.file)).toEqual(["a.md", "b.md"]);
    expect(caps[0]!.name).toBe("Alpha");
  });
});
