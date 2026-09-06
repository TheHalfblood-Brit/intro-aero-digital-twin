// tests/student/trim-response.test.js
import { describe, it, expect } from "vitest";
import {
  computeCmAtAlpha,
  computeTrimAngleDeg,
  computeDeltaCm,
  classifyDisturbanceTendency,
  computeTrimResponse,
  radToDeg,
} from "../../src/student/physics/trim-response.js";

// Tolerance note: Section 9.1 states ±1e-6 for Cm(alpha)/delta_Cm, but the
// only pre-calculated reference numbers given (e.g. "-0.0279") are rounded
// to 4 decimal places, whose own rounding error (~5e-5) already exceeds
// ±1e-6. ±1e-4 is used instead here — the same tolerance the model itself
// uses for its "trimmed" classification (Section 2). The ±1e-4 deg trim-
// angle tolerance from Section 9.1 is used as stated, since its underlying
// reference (0.05 rad) is exact, not rounded.
const CM_TOLERANCE = 1e-4;
const TRIM_ANGLE_DEG_TOLERANCE = 1e-4;

describe("trim-response physics — Section 9 verification cases", () => {
  it("Case 1: statically stable (Cm_alpha = -0.8)", () => {
    const trimAngleDeg = computeTrimAngleDeg(0.04, -0.8);
    const deltaCm = computeDeltaCm(-0.8, 2.0);
    const tendency = classifyDisturbanceTendency(2.0, deltaCm);

    expect(trimAngleDeg).toBeGreaterThan(0);
    expect(Math.abs(trimAngleDeg - radToDeg(0.05))).toBeLessThanOrEqual(
      TRIM_ANGLE_DEG_TOLERANCE
    );
    expect(deltaCm).toBeLessThan(0);
    expect(Math.abs(deltaCm - -0.0279)).toBeLessThanOrEqual(CM_TOLERANCE);
    expect(tendency).toBe("restoring");
  });

  it("Case 2: neutrally stable (Cm_alpha = 0)", () => {
    const trimAngleDeg = computeTrimAngleDeg(0.04, 0);
    const deltaCm = computeDeltaCm(0, 2.0);
    const tendency = classifyDisturbanceTendency(2.0, deltaCm);

    expect(trimAngleDeg).toBe("not available");
    expect(deltaCm).toBe(0);
    expect(tendency).toBe("neutral");
  });

  it("Case 3: statically unstable (Cm_alpha = +0.8)", () => {
    const trimAngleDeg = computeTrimAngleDeg(0.04, 0.8);
    const deltaCm = computeDeltaCm(0.8, 2.0);
    const tendency = classifyDisturbanceTendency(2.0, deltaCm);

    expect(trimAngleDeg).toBeLessThan(0);
    expect(Math.abs(trimAngleDeg - radToDeg(-0.05))).toBeLessThanOrEqual(
      TRIM_ANGLE_DEG_TOLERANCE
    );
    expect(deltaCm).toBeGreaterThan(0);
    expect(Math.abs(deltaCm - 0.0279)).toBeLessThanOrEqual(CM_TOLERANCE);
    expect(tendency).toBe("destabilizing");
  });

  it("Section 9.1: numerical reference case (alpha at trim angle)", () => {
    const result = computeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(Math.abs(result.cmAtAlpha)).toBeLessThanOrEqual(CM_TOLERANCE);
    expect(result.trimmed).toBe(true);
    expect(Math.abs(result.deltaCm - -0.0279)).toBeLessThanOrEqual(CM_TOLERANCE);
    expect(result.tendency).toBe("restoring");
  });

  it("Section 9.2: behavioral case — flipping disturbance sign flips delta_Cm sign", () => {
    const positive = computeDeltaCm(-0.8, 2.0);
    const negativeDisturbance = computeDeltaCm(-0.8, -2.0);

    expect(negativeDisturbance).toBeGreaterThan(0);
    expect(Math.abs(negativeDisturbance + positive)).toBeLessThanOrEqual(CM_TOLERANCE);
  });

  it("Section 9.3: boundary case — Cm_alpha = 0 must not divide by zero", () => {
    expect(() => computeTrimAngleDeg(0.04, 0)).not.toThrow();
    expect(computeTrimAngleDeg(0.04, 0)).toBe("not available");
  });
});

describe("trim-response physics — additional behavioral checks (Section 7)", () => {
  it("prediction 3: Cm_alpha = 0 produces no correcting moment for any disturbance", () => {
    expect(computeDeltaCm(0, 5)).toBe(0);
    expect(computeDeltaCm(0, -5)).toBe(0);
  });

  it("prediction 4: trim-angle magnitude decreases as |Cm_alpha| increases (Cm0 fixed)", () => {
    const smallerSlopeMagnitude = Math.abs(computeTrimAngleDeg(0.04, -0.8));
    const largerSlopeMagnitude = Math.abs(computeTrimAngleDeg(0.04, -1.6));
    expect(largerSlopeMagnitude).toBeLessThan(smallerSlopeMagnitude);
  });

  it("prediction 5: doubling disturbanceAlphaDeg doubles the magnitude of delta_Cm", () => {
    const base = computeDeltaCm(-0.8, 2.0);
    const doubled = computeDeltaCm(-0.8, 4.0);
    expect(Math.abs(doubled)).toBeCloseTo(Math.abs(base) * 2, 6);
  });

  it("rejects non-finite or invalid numeric inputs", () => {
    expect(() => computeCmAtAlpha(NaN, -0.8, 2.86)).toThrow();
    expect(() => computeDeltaCm(-0.8, undefined)).toThrow();
    expect(() => computeTrimAngleDeg("0.04", -0.8)).toThrow();
  });
});

// Passing these tests demonstrates only that the implementation matches
// this linear, quasi-static Cm-alpha model as specified. It is not evidence
// of real-world model validity, safety, or flightworthiness.