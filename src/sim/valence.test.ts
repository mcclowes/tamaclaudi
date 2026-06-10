import { describe, it, expect } from "vitest";
import { wellbeing, smoothValence, VALENCE_TAU_HOURS } from "./valence.js";

describe("wellbeing", () => {
  it("is the mean of the five needs", () => {
    expect(wellbeing({ fullness: 70, energy: 70, hygiene: 80, joy: 65, bond: 30 })).toBeCloseTo(63);
    expect(wellbeing({ fullness: 100, energy: 100, hygiene: 100, joy: 100, bond: 100 })).toBe(100);
    expect(wellbeing({ fullness: 0, energy: 0, hygiene: 0, joy: 0, bond: 0 })).toBe(0);
  });
});

describe("smoothValence", () => {
  it("starts a fresh creature (no prior valence) right at its wellbeing", () => {
    expect(smoothValence(undefined, 63, 2)).toBe(63);
  });

  it("does not move when no time has passed", () => {
    expect(smoothValence(40, 100, 0)).toBe(40);
  });

  it("lags: over one time-constant it closes ~63% of the gap, not all of it", () => {
    // alpha = 1 - e^-1 ≈ 0.632, so from 0 toward 100 lands near 63.
    const v = smoothValence(0, 100, VALENCE_TAU_HOURS);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
    expect(v).toBeCloseTo(63.2, 1);
  });

  it("a short tick barely moves valence — feelings carry across ticks", () => {
    // A ~10-minute tick (0.17h) should shift valence only a few points.
    const v = smoothValence(50, 100, 0.17);
    expect(v).toBeGreaterThan(50);
    expect(v).toBeLessThan(55);
  });

  it("converges toward the target over a long span", () => {
    expect(smoothValence(0, 100, VALENCE_TAU_HOURS * 10)).toBeGreaterThan(99);
  });

  it("clamps into 0–100 even if handed out-of-range values", () => {
    expect(smoothValence(50, 200, 1000)).toBe(100);
    expect(smoothValence(-50, -200, 1000)).toBe(0);
  });
});
