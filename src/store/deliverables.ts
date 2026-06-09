import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Deliverable } from "../types.js";
import { paths, type CreaturePaths } from "./paths.js";

function readArray<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as T[];
}

function writeArray(file: string, value: unknown[]): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/** Next id with a given prefix, derived from existing ids — no randomness. */
function nextId<T extends { id: string }>(items: T[], prefix: string): string {
  let max = 0;
  for (const item of items) {
    const n = Number(item.id.replace(prefix, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

export function readDeliverables(p: CreaturePaths = paths()): Deliverable[] {
  return readArray<Deliverable>(p.deliverables);
}

export function writeDeliverables(items: Deliverable[], p: CreaturePaths = paths()): void {
  writeArray(p.deliverables, items);
}

export function addDeliverable(
  fields: { title: string; summary?: string; path?: string; at: string },
  p: CreaturePaths = paths(),
): Deliverable {
  const items = readDeliverables(p);
  const deliverable: Deliverable = {
    id: nextId(items, "d"),
    at: fields.at,
    title: fields.title,
    summary: fields.summary,
    path: fields.path,
    status: "ready",
  };
  items.push(deliverable);
  writeDeliverables(items, p);
  return deliverable;
}

/**
 * @mcclowes resolves a ready deliverable: `accepted` (picked it up) or
 * `shelved` (not now). Only a ready deliverable can be resolved.
 */
export function resolveDeliverable(
  id: string,
  status: "accepted" | "shelved",
  outcome: string | undefined,
  p: CreaturePaths = paths(),
): Deliverable {
  const items = readDeliverables(p);
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`No deliverable with id ${id}.`);
  if (found.status !== "ready") {
    throw new Error(`Deliverable ${id} is already ${found.status}.`);
  }
  found.status = status;
  found.outcome = outcome;
  writeDeliverables(items, p);
  return found;
}
