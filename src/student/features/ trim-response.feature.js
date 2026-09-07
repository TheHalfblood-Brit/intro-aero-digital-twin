// src/student/features/trim-response.feature.js
// Feature ID: trim-response — Live Cm-alpha relationship and trim (Section 1).
// No React, JSX, HTML, CSS, class names, inline styles, or shared UI
// components. Calls only the imported pure physics functions; does not
// repeat any equation from trim-response.js or any earlier stage.

import {
  computeTrimAngleDeg,
  computeDeltaCm,
  classifyDisturbanceTendency,
  computeTrimResponse,
  generateCmAlphaCurve,
  radToDeg,
} from "../physics/trim-response.js";

const ENGINEERING_QUESTION =
  "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?";

const REQUIRED_CAPABILITY_ID = "loads.pitch.component-sum";
const REQUIRED_CAPABILITY_MIN_VERSION = 1;

// See implementation notes above the code blocks: the given ±1e-6 Section
// 9.1 tolerance is tighter than the given 4-decimal-place reference numbers
// (e.g. "-0.0279") can support, so ±1e-4 is used for Cm(alpha)/delta_Cm
// reference comparisons — the same magnitude as the model's own "trimmed"
// classification tolerance (Section 2). The trim-angle tolerance of ±1e-4
// deg is used as stated, since its reference (0.05 rad) is exact.
const REFERENCE_VALUE_TOLERANCE = 1e-4;
const TRIM_ANGLE_DEG_TOLERANCE = 1e-4;

function withinTolerance(actual, expected, tolerance) {
  return (
    typeof actual === "number" &&
    Number.isFinite(actual) &&
    Math.abs(actual - expected) <= tolerance
  );
}

// Duck-typed capability lookup: the exact capabilityContext / capabilities
// shape isn't defined in this specification, so a few conventional shapes
// are supported defensively rather than assumed.
function resolveCapabilityVersion(capabilitySource, id) {
  if (!capabilitySource) return undefined;
  if (typeof capabilitySource.getCapabilityVersion === "function") {
    return capabilitySource.getCapabilityVersion(id);
  }
  if (typeof capabilitySource.get === "function") {
    const entry = capabilitySource.get(id);
    return typeof entry === "number" ? entry : entry?.version;
  }
  const entry = capabilitySource[id];
  return typeof entry === "number" ? entry : entry?.version;
}

function hasRequiredCapability(capabilitySource, id, minVersion) {
  const version = resolveCapabilityVersion(capabilitySource, id);
  return typeof version === "number" && version >= minVersion;
}

// src/student/features/trim-response.feature.js — only buildVerificationCases() changed:
// every "description:" key below is renamed to "label:" to match the
// repository's fixed adapter contract (tests/core/stage4-integration.test.js).

function buildVerificationCases() {
  // Case 1 — statically stable (Cm_alpha = -0.8)
  const case1TrimAngleDeg = computeTrimAngleDeg(0.04, -0.8);
  const case1DeltaCm = computeDeltaCm(-0.8, 2.0);
  const case1Tendency = classifyDisturbanceTendency(2.0, case1DeltaCm);
  const case1Passed =
    withinTolerance(case1TrimAngleDeg, radToDeg(0.05), TRIM_ANGLE_DEG_TOLERANCE) &&
    case1TrimAngleDeg > 0 &&
    withinTolerance(case1DeltaCm, -0.0279, REFERENCE_VALUE_TOLERANCE) &&
    case1DeltaCm < 0 &&
    case1Tendency === "restoring";

  // Case 2 — neutrally stable (Cm_alpha = 0)
  const case2TrimAngleDeg = computeTrimAngleDeg(0.04, 0);
  const case2DeltaCm = computeDeltaCm(0, 2.0);
  const case2Tendency = classifyDisturbanceTendency(2.0, case2DeltaCm);
  const case2Passed =
    case2TrimAngleDeg === "not available" &&
    case2DeltaCm === 0 &&
    case2Tendency === "neutral";

  // Case 3 — statically unstable (Cm_alpha = +0.8)
  const case3TrimAngleDeg = computeTrimAngleDeg(0.04, 0.8);
  const case3DeltaCm = computeDeltaCm(0.8, 2.0);
  const case3Tendency = classifyDisturbanceTendency(2.0, case3DeltaCm);
  const case3Passed =
    withinTolerance(case3TrimAngleDeg, radToDeg(-0.05), TRIM_ANGLE_DEG_TOLERANCE) &&
    case3TrimAngleDeg < 0 &&
    withinTolerance(case3DeltaCm, 0.0279, REFERENCE_VALUE_TOLERANCE) &&
    case3DeltaCm > 0 &&
    case3Tendency === "destabilizing";

  // Section 9.1 — numerical reference case
  const ref = computeTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  });
  const refPassed =
    withinTolerance(ref.cmAtAlpha, 0, REFERENCE_VALUE_TOLERANCE) &&
    ref.trimmed === true &&
    withinTolerance(ref.deltaCm, -0.0279, REFERENCE_VALUE_TOLERANCE) &&
    ref.tendency === "restoring";

  // Section 9.2 — behavioral case
  const flippedDeltaCm = computeDeltaCm(-0.8, -2.0);
  const behavioralPassed =
    flippedDeltaCm > 0 &&
    withinTolerance(flippedDeltaCm, 0.0279, REFERENCE_VALUE_TOLERANCE);

  // Section 9.3 — boundary case
  let boundaryPassed;
  try {
    boundaryPassed = computeTrimAngleDeg(0.04, 0) === "not available";
  } catch {
    boundaryPassed = false;
  }

  return [
    {
      id: "case1-statically-stable",
      label:
        "Case 1 (Cm_alpha = -0.8): trim angle positive, delta_Cm negative, restoring tendency.",
      passed: case1Passed,
    },
    {
      id: "case2-neutrally-stable",
      label:
        "Case 2 (Cm_alpha = 0): trim angle not available, delta_Cm = 0, neutral tendency.",
      passed: case2Passed,
    },
    {
      id: "case3-statically-unstable",
      label:
        "Case 3 (Cm_alpha = +0.8): trim angle negative, delta_Cm positive, destabilizing tendency.",
      passed: case3Passed,
    },
    {
      id: "section-9-1-reference-case",
      label:
        "Reference case (alpha = 2.86 deg = trim angle): Cm(alpha) within trimmed tolerance of 0, trimmed, restoring.",
      passed: refPassed,
    },
    {
      id: "section-9-2-behavioral-case",
      label: "Flipping disturbanceAlphaDeg sign flips delta_Cm sign, same magnitude.",
      passed: behavioralPassed,
    },
    {
      id: "section-9-3-boundary-case",
      label:
        'Cm_alpha = 0 reports trim angle as "not available" without dividing by zero.',
      passed: boundaryPassed,
    },
  ];
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates whether the linear Cm-alpha pitching-moment model is trimmed at the selected angle of attack and whether a small angle-of-attack disturbance produces a restoring or destabilizing tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: ["cm0", "cmAlphaPerRad", "angleOfAttackDeg", "disturbanceAlphaDeg"],
  requiresCapabilities: [
    { id: REQUIRED_CAPABILITY_ID, version: REQUIRED_CAPABILITY_MIN_VERSION },
  ],
  providesCapabilities: [{ id: "stability.pitch.cm-alpha", version: 1 }],
  assumptions: [
    "Cm-alpha relationship assumed linear over the investigated range.",
    "Quasi-static model representing a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive nose-up sign convention for pitching moment and angle of attack.",
  ],
  validityLimits: [
    "Not valid at stall, large angle of attack, or where coefficients are strongly nonlinear.",
    "Does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency here is not proof of safety, controllability, or flightworthiness.",
    "Calculated trim angle is meaningful only where the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    const capabilityAvailable = hasRequiredCapability(
      capabilityContext,
      REQUIRED_CAPABILITY_ID,
      REQUIRED_CAPABILITY_MIN_VERSION
    );

    if (!capabilityAvailable) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question: ENGINEERING_QUESTION,
          interpretation: `Locked: required capability "${REQUIRED_CAPABILITY_ID}" (v${REQUIRED_CAPABILITY_MIN_VERSION}+) is not yet available.`,
          status: "neutral",
        },
        plots: [],
        scene: null,
      };
    }

    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;
    const { cmAtAlpha, trimAngleDeg, deltaCm, trimmed, tendency } =
      computeTrimResponse({ cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg });

    const results = [
      {
        id: "cmAtAlpha",
        label: "Cm at selected angle of attack",
        value: cmAtAlpha,
        unit: "",
        precision: 4,
        emphasis: true,
      },
      {
        id: "trimAngleDeg",
        label: "Trim angle",
        value: trimAngleDeg,
        unit: trimAngleDeg === "not available" ? "" : "deg",
        precision: 2,
      },
      {
        id: "deltaCm",
        label: "Disturbance ΔCm",
        value: deltaCm,
        unit: "",
        precision: 4,
      },
      {
        id: "trimmed",
        label: "Trim status",
        value: trimmed ? "trimmed" : "not trimmed",
        unit: "",
        precision: 0,
      },
      {
        id: "tendency",
        label: "Disturbance tendency",
        value: tendency,
        unit: "",
        precision: 0,
      },
    ];

    const status =
      trimmed && tendency === "restoring"
        ? "pass"
        : tendency === "destabilizing"
        ? "caution"
        : "neutral";

    const decision = {
      question: ENGINEERING_QUESTION,
      interpretation: `At the selected angle of attack the linear model is ${
        trimmed ? "trimmed" : "not trimmed"
      }, and the disturbance response is ${tendency}. This reflects only the static tendency of this simplified linear model; it does not establish dynamic stability, controllability, or flightworthiness.`,
      status,
    };

    const curve = generateCmAlphaCurve(cm0, cmAlphaPerRad, angleOfAttackDeg);
        const plots = [
      {
        id: "cmAlphaCurve",
        title: "Cm vs angle of attack",
        xLabel: "Angle of attack (deg)",
        yLabel: "Cm (dimensionless)",
        series: [
          {
            label: "Cm(alpha)",
            points: curve.map((p) => ({ x: p.angleOfAttackDeg, y: p.cm })),
          },
        ],
        regions: [],
        referenceLines: [{ label: "Trim line (Cm = 0)", axis: "y", value: 0 }],
      },
    ];

    return {
      results,
      verificationCases: buildVerificationCases(),
      decision,
      plots,
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",
  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft ?? runtimeContext ?? {};
    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;
    const values = computeTrimResponse({
      cm0,
      cmAlphaPerRad,
      angleOfAttackDeg,
      disturbanceAlphaDeg,
    });
    return { values };
  },
};