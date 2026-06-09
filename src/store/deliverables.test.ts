import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, type CreaturePaths } from "./paths.js";
import { addDeliverable, readDeliverables, resolveDeliverable } from "./deliverables.js";

let dir: string;
let p: CreaturePaths;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tama-"));
  p = paths(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("deliverables store", () => {
  it("adds a deliverable ready, with an incrementing id", () => {
    const a = addDeliverable({ title: "Show HN draft", at: "2026-06-09T00:00:00Z" }, p);
    const b = addDeliverable({ title: "press kit", at: "2026-06-09T00:01:00Z" }, p);
    expect(a.id).toBe("d1");
    expect(b.id).toBe("d2");
    expect(a.status).toBe("ready");
    expect(readDeliverables(p)).toHaveLength(2);
  });

  it("keeps the optional summary and path", () => {
    const d = addDeliverable(
      { title: "kit", summary: "ready copy", path: "workshop/kit.md", at: "2026-06-09T00:00:00Z" },
      p,
    );
    expect(d.summary).toBe("ready copy");
    expect(d.path).toBe("workshop/kit.md");
  });

  it("accepts a ready deliverable with an outcome", () => {
    addDeliverable({ title: "kit", at: "2026-06-09T00:00:00Z" }, p);
    const d = resolveDeliverable("d1", "accepted", "shipped it", p);
    expect(d.status).toBe("accepted");
    expect(d.outcome).toBe("shipped it");
  });

  it("shelves a ready deliverable", () => {
    addDeliverable({ title: "kit", at: "2026-06-09T00:00:00Z" }, p);
    expect(resolveDeliverable("d1", "shelved", undefined, p).status).toBe("shelved");
  });

  it("refuses to resolve a deliverable that isn't ready", () => {
    addDeliverable({ title: "kit", at: "2026-06-09T00:00:00Z" }, p);
    resolveDeliverable("d1", "accepted", undefined, p);
    expect(() => resolveDeliverable("d1", "shelved", undefined, p)).toThrow(/already accepted/);
  });

  it("throws on an unknown id", () => {
    expect(() => resolveDeliverable("d9", "accepted", undefined, p)).toThrow(/No deliverable/);
  });
});
