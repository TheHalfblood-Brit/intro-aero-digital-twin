// src/student/physics/trim-response.js
// Stage 4 — Live Cm-alpha relationship and trim.
// Pure physics functions for the linear, quasi-static pitching-moment model
// (Stage 4 spec, Section 2). No React imports, no browser dependencies,
// no mutable shared state.
//
// Units: cm0 and Cm(alpha) are dimensionless; cmAlphaPerRad is 1/rad;
// angleOfAttackDeg and disturbanceAlphaDeg are in degrees and are converted
// to radians internally before being combined with cmAlphaPerRad.
// Sign convention: positive pitching moment and positive angle of attack
// are both nose-up.

const DEG_TO_RAD = Math.PI / 180;
const TRIMMED_TOLERANCE = 1e-4; // |Cm(alpha)| <= this => trimmed (Section 2)

/** Reject non-finite / non-numeric inputs before doing physics with them. */
function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got: ${String(value)}`);
  }
}

/** Convert an angle in degrees to radians. */
export function degToRad(angleDeg) {
  assertFiniteNumber(angleDeg, "angleDeg");
  return angleDeg * DEG_TO_RAD;
}

/** Convert an angle in radians to degrees. */
export function radToDeg(angleRad) {
  assertFiniteNumber(angleRad, "angleRad");
  return angleRad / DEG_TO_RAD;
}

/**
 * Pitching-moment coefficient at a given angle of attack:
 *   Cm(alpha) = Cm0 + Cm_alpha * alpha_rad
 * cm0: dimensionless. cmAlphaPerRad: 1/rad. angleOfAttackDeg: deg.
 * Returns: dimensionless Cm(alpha).
 */
export function computeCmAtAlpha(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const alphaRad = degToRad(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

/**
 * Trim angle, in degrees, where Cm(alpha) = 0:
 *   alpha_trim_rad = -Cm0 / Cm_alpha
 * Returns the string "not available" when cmAlphaPerRad is zero, since no
 * unique trim angle exists and division by zero must not occur (Section 2).
 */
export function computeTrimAngleDeg(cm0, cmAlphaPerRad) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  if (cmAlphaPerRad === 0) {
    return "not available";
  }
  const alphaTrimRad = -cm0 / cmAlphaPerRad;
  return radToDeg(alphaTrimRad);
}

/**
 * Disturbance moment-coefficient change:
 *   delta_Cm = Cm_alpha * delta_alpha_rad
 * cmAlphaPerRad: 1/rad. disturbanceAlphaDeg: deg. Returns: dimensionless.
 */
export function computeDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const deltaAlphaRad = degToRad(disturbanceAlphaDeg);
  return cmAlphaPerRad * deltaAlphaRad;
}

/**
 * Whether the selected condition is trimmed: |Cm(alpha)| <= 1e-4 (Section 2).
 */
export function isTrimmed(cmAtAlpha) {
  assertFiniteNumber(cmAtAlpha, "cmAtAlpha");
  return Math.abs(cmAtAlpha) <= TRIMMED_TOLERANCE;
}

/**
 * Classifies the disturbance tendency by the sign of
 * delta_alpha_rad * delta_Cm (Section 2):
 *   negative -> "restoring", positive -> "destabilizing", zero -> "neutral".
 */
export function classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm) {
  assertFiniteNumber(deltaCm, "deltaCm");
  const deltaAlphaRad = degToRad(disturbanceAlphaDeg);
  const product = deltaAlphaRad * deltaCm;
  if (product < 0) return "restoring";
  if (product > 0) return "destabilizing";
  return "neutral";
}

/**
 * Runs the full Stage 4 model for one aircraft input set and returns every
 * value required by Section 4. This is the single place the governing
 * equations are combined; callers should use this rather than re-deriving
 * any equation themselves.
 */
export function computeTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg,
}) {
  const cmAtAlpha = computeCmAtAlpha(cm0, cmAlphaPerRad, angleOfAttackDeg);
  const trimAngleDeg = computeTrimAngleDeg(cm0, cmAlphaPerRad);
  const deltaCm = computeDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);
  const trimmed = isTrimmed(cmAtAlpha);
  const tendency = classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm);
  return { cmAtAlpha, trimAngleDeg, deltaCm, trimmed, tendency };
}

/**
 * Generates Cm-alpha curve points for plotting (Section 10), evaluated only
 * through computeCmAtAlpha. Always spans -10..+10 deg and always includes
 * the exact selected angleOfAttackDeg as one of the points.
 */
export function generateCmAlphaCurve(
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  { minDeg = -10, maxDeg = 10, sampleCount = 41 } = {}
) {
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  const step = (maxDeg - minDeg) / (sampleCount - 1);
  const anglesDeg = new Set();
  for (let i = 0; i < sampleCount; i += 1) {
    anglesDeg.add(minDeg + i * step);
  }
  anglesDeg.add(angleOfAttackDeg);
  return Array.from(anglesDeg)
    .sort((a, b) => a - b)
    .map((deg) => ({
      angleOfAttackDeg: deg,
      cm: computeCmAtAlpha(cm0, cmAlphaPerRad, deg),
    }));
}