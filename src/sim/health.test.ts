import { describe, it, expect } from "vitest";
import { computeHealth, SICK_AFTER_HOURS, DEATH_AFTER_HOURS } from "./health.js";
import { startingNeeds } from "./stats.js";
import { DEFAULT_CONFIG, type Config, type Needs } from "../types.js";

const REAL_STAKES: Config = { realStakes: true };

function danger(): Needs {
  return { ...startingNeeds(), fullness: 5 };
}

const t = (iso: string) => new Date(iso);

describe("computeHealth", () => {
  it("stays well when needs are comfortable, clearing any timer", () => {
    const r = computeHealth(
      { health: "well", ailingSince: "2026-06-08T00:00:00Z" },
      startingNeeds(),
      "baby",
      t("2026-06-08T01:00:00Z"),
      DEFAULT_CONFIG,
    );
    expect(r.health).toBe("well");
    expect(r.ailingSince).toBeNull();
  });

  it("starts the ailing timer but warns rather than sickening immediately", () => {
    const now = "2026-06-08T00:00:00Z";
    const r = computeHealth(
      { health: "well", ailingSince: null },
      danger(),
      "baby",
      t(now),
      DEFAULT_CONFIG,
    );
    expect(r.health).toBe("well");
    expect(r.ailingSince).toBe(new Date(now).toISOString());
    expect(r.warning).toMatch(/dangerously low/);
  });

  it("turns sick after sustained danger", () => {
    const since = "2026-06-08T00:00:00Z";
    const later = new Date(
      new Date(since).getTime() + (SICK_AFTER_HOURS + 1) * 3_600_000,
    ).toISOString();
    const r = computeHealth(
      { health: "well", ailingSince: since },
      danger(),
      "baby",
      t(later),
      DEFAULT_CONFIG,
    );
    expect(r.health).toBe("sick");
  });

  it("recovers instantly once needs are tended", () => {
    const r = computeHealth(
      { health: "sick", ailingSince: "2026-06-08T00:00:00Z" },
      startingNeeds(),
      "baby",
      t("2026-06-09T00:00:00Z"),
      DEFAULT_CONFIG,
    );
    expect(r.health).toBe("well");
    expect(r.ailingSince).toBeNull();
  });

  it("never kills in forgiving mode, however long the neglect", () => {
    const since = "2026-06-01T00:00:00Z";
    const r = computeHealth(
      { health: "sick", ailingSince: since },
      danger(),
      "baby",
      t("2026-06-30T00:00:00Z"),
      DEFAULT_CONFIG,
    );
    expect(r.health).toBe("sick");
  });

  it("kills after prolonged danger when realStakes is on", () => {
    const since = "2026-06-08T00:00:00Z";
    const later = new Date(
      new Date(since).getTime() + (DEATH_AFTER_HOURS + 1) * 3_600_000,
    ).toISOString();
    const r = computeHealth(
      { health: "sick", ailingSince: since },
      danger(),
      "baby",
      t(later),
      REAL_STAKES,
    );
    expect(r.health).toBe("dead");
  });

  it("stays dead once dead", () => {
    const r = computeHealth(
      { health: "dead", ailingSince: null },
      startingNeeds(),
      "adult",
      t("2026-06-09T00:00:00Z"),
      REAL_STAKES,
    );
    expect(r.health).toBe("dead");
  });

  it("an egg is always well", () => {
    const r = computeHealth(
      { health: "well", ailingSince: null },
      danger(),
      "egg",
      t("2026-06-08T00:00:00Z"),
      DEFAULT_CONFIG,
    );
    expect(r.health).toBe("well");
  });
});
