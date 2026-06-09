import { describe, it, expect, afterEach } from "vitest";
import { join, resolve } from "node:path";
import { paths, creatureDir, historyFile, dateStamp } from "./paths.js";

const savedHome = process.env.TAMA_HOME;
afterEach(() => {
  if (savedHome === undefined) delete process.env.TAMA_HOME;
  else process.env.TAMA_HOME = savedHome;
});

describe("creatureDir", () => {
  it("defaults to ./creature under the cwd", () => {
    delete process.env.TAMA_HOME;
    expect(creatureDir()).toBe(resolve(process.cwd(), "creature"));
  });

  it("honours TAMA_HOME, resolved to an absolute path", () => {
    process.env.TAMA_HOME = "/tmp/some-pet";
    expect(creatureDir()).toBe(resolve("/tmp/some-pet"));
  });
});

describe("paths", () => {
  it("assembles every store file under the given dir", () => {
    const p = paths("/pets/pip");
    expect(p.dir).toBe("/pets/pip");
    expect(p.seed).toBe(join("/pets/pip", "seed.json"));
    expect(p.events).toBe(join("/pets/pip", "events.jsonl"));
    expect(p.goals).toBe(join("/pets/pip", "goals.json"));
    expect(p.historyDir).toBe(join("/pets/pip", "history"));
    expect(p.workshopDir).toBe(join("/pets/pip", "workshop"));
  });
});

describe("historyFile", () => {
  it("points at a dated markdown page inside history/", () => {
    expect(historyFile("2026-06-08", "/pets/pip")).toBe(
      join("/pets/pip", "history", "2026-06-08.md"),
    );
  });
});

describe("dateStamp", () => {
  it("formats YYYY-MM-DD in UTC, regardless of time of day", () => {
    expect(dateStamp(new Date("2026-06-08T23:59:59.000Z"))).toBe("2026-06-08");
    expect(dateStamp(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01");
  });
});
