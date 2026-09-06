// src/student/features/trim-response.feature.js
// Feature ID: trim-response — Live Cm-alpha relationship and trim (Section 1).
// No React, JSX, HTML, CSS, class names, inline styles, or shared UI
// components. Calls only the imported pure physics functions; does not
// repeat any equation from trim-response.js or any earlier stage.

iimport {
  computeCmAtAlpha,
  computeTrimAngleDeg,
  computeDeltaCm,
  isTrimmed,
  classifyDisturbanceTendency
} from "../physics/trim-response.js";

const ENGINEERING_QUESTION =
  "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?";

const REQUIRED_CAPABILITY_ID = "loads.pitch.component-sum";
const REQUIRED_CAPABILITY_VERSION = 1;

const PLOT_RANGE_DEG = { min: -10, max: 10, stepDeg: 1 };

// Defensive capability check. The exact capabilityContext shape is not part
// of this specification, so several common access patterns are tried; if
// none can confirm the capability, it is treated as unavailable rather than
// throwing. The provided app-level requiresCapabilities gating is the
// primary lock — this is a secondary, in-analyze confirmation only.
function isRequiredCapabilityAvailable(capabilityContext) {
  if (!capabilityContext) return false;
  if (typeof capabilityContext.has === "function") {
    return Boolean(
      capabilityContext.has(REQUIRED_CAPABILITY_ID, REQUIRED_CAPABILITY_VERSION)
    );
  }
  if (typeof capabilityContext.get === "function") {
    return capabilityContext.get(REQUIRED_CAPABILITY_ID) != null;
  }
  const caps = capabilityContext.capabilities;
  if (Array.isArray(caps)) {
    return caps.some(
      (cap) =>
        cap &&
        cap.id === REQUIRED_CAPABILITY_ID &&
        cap.version >= REQUIRED_CAPABILITY_VERSION
    );
  }
  if (caps && typeof caps === "object") {
    return caps[REQUIRED_CAPABILITY_ID] != null;
  }
  // capabilityContext may itself be a flat id -> version (or id -> truthy) map.
  if (
    Object.prototype.hasOwnProperty.call(capabilityContext, REQUIRED_CAPABILITY_ID)
  ) {
    const entry = capabilityContext[REQUIRED_CAPABILITY_ID];
    if (typeof entry === "number") return entry >= REQUIRED_CAPABILITY_VERSION;
    return entry != null && entry !== false;
  }
  return false;
}

// Builds the Cm-alpha curve from -10 deg to +10 deg using the physics
// function, and ensures the selected angle of attack is included as a point
// even if it falls between grid steps.
function buildCmAlphaSeries(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  const { min, max, stepDeg } = PLOT_RANGE_DEG;
  const points = [];
  for (let deg = min; deg <= max; deg += stepDeg) {
    points.push({ x: deg, y: computeCmAtAlpha(cm0, cmAlphaPerRad, deg) });
  }
  if (angleOfAttackDeg >= min && angleOfAttackDeg <= max) {
    const alreadyOnGrid = points.some(
      (p) => Math.abs(p.x - angleOfAttackDeg) < 1e-9
    );
    if (!alreadyOnGrid) {
      points.push({
        x: angleOfAttackDeg,
        y: computeCmAtAlpha(cm0, cmAlphaPerRad, angleOfAttackDeg)
      });
    }
  }
  points.sort((a, b) => a.x - b.x);
  return points;
}

// The three student-defined verification cases from Section 9, evaluated
// with the imported physics functions (not hard-coded booleans).
function buildVerificationCases() {
  const case1 = { cm0: 0.04, cmAlphaPerRad: -0.8, disturbanceAlphaDeg: 2.0 };
  const case1TrimDeg = computeTrimAngleDeg(case1.cm0, case1.cmAlphaPerRad);
  const case1DeltaCm = computeDeltaCm(case1.cmAlphaPerRad, case1.disturbanceAlphaDeg);
  const case1Tendency = classifyDisturbanceTendency(case1.disturbanceAlphaDeg, case1DeltaCm);

  const case2 = { cm0: 0.04, cmAlphaPerRad: 0, disturbanceAlphaDeg: 2.0 };
  const case2TrimDeg = computeTrimAngleDeg(case2.cm0, case2.cmAlphaPerRad);
  const case2DeltaCm = computeDeltaCm(case2.cmAlphaPerRad, case2.disturbanceAlphaDeg);
  const case2Tendency = classifyDisturbanceTendency(case2.disturbanceAlphaDeg, case2DeltaCm);

  const case3 = { cm0: 0.04, cmAlphaPerRad: 0.8, disturbanceAlphaDeg: 2.0 };
  const case3TrimDeg = computeTrimAngleDeg(case3.cm0, case3.cmAlphaPerRad);
  const case3DeltaCm = computeDeltaCm(case3.cmAlphaPerRad, case3.disturbanceAlphaDeg);
  const case3Tendency = classifyDisturbanceTendency(case3.disturbanceAlphaDeg, case3DeltaCm);

  return [
    {
      id: "case-1-statically-stable",
      label: "Statically stable (Cm_alpha < 0)",
      passed:
        typeof case1TrimDeg === "number" &&
        case1TrimDeg > 0 &&
        case1DeltaCm < 0 &&
        case1Tendency === "restoring"
    },
    {
      id: "case-2-neutrally-stable",
      label: "Neutrally stable (Cm_alpha = 0)",
      passed:
        case2TrimDeg === "not available" &&
        case2DeltaCm === 0 &&
        case2Tendency === "neutral"
    },
    {
      id: "case-3-statically-unstable",
      label: "Statically unstable (Cm_alpha > 0)",
      passed:
        typeof case3TrimDeg === "number" &&
        case3TrimDeg < 0 &&
        case3DeltaCm > 0 &&
        case3Tendency === "destabilizing"
    }
  ];
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm\u2013alpha relationship and trim",
  description:
    "Evaluates whether the linear Cm-alpha model is trimmed at the selected angle of attack and classifies the tendency of a small disturbance.",
  category: "Stability \u00b7 Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg"
  ],
  requiresCapabilities: [
    { id: REQUIRED_CAPABILITY_ID, version: REQUIRED_CAPABILITY_VERSION }
  ],
  providesCapabilities: [{ id: "stability.pitch.cm-alpha", version: 1 }],
  assumptions: [
    "The Cm-alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Sign convention: positive nose-up pitching moment and positive nose-up angle of attack."
  ],
  validityLimits: [
    "Not valid at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "Does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency here is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only where the linear model remains valid at that angle."
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },

  analyze(aircraft, capabilityContext) {
    if (!isRequiredCapabilityAvailable(capabilityContext)) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question: ENGINEERING_QUESTION,
          interpretation:
            "Required capability loads.pitch.component-sum (v1) is not confirmed available, so no trim evaluation was performed.",
          status: "caution"
        },
        plots: [],
        scene: null
      };
    }

    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;

    const cmAtAlpha = computeCmAtAlpha(cm0, cmAlphaPerRad, angleOfAttackDeg);
    const trimAngleDeg = computeTrimAngleDeg(cm0, cmAlphaPerRad);
    const deltaCm = computeDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);
    const trimmed = isTrimmed(cmAtAlpha);
    const tendency = classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm);

    const results = [
      {
        id: "cmAtAlpha",
        label: "Cm(alpha)",
        value: cmAtAlpha,
        unit: "",
        precision: 4,
        emphasis: true
      },
      {
        id: "trimAngleDeg",
        label: "Trim angle",
        value: trimAngleDeg,
        unit: typeof trimAngleDeg === "number" ? "deg" : "",
        precision: 2,
        emphasis: false
      },
      {
        id: "deltaCm",
        label: "Delta Cm",
        value: deltaCm,
        unit: "",
        precision: 4,
        emphasis: false
      },
      {
        id: "trimmedStatus",
        label: "Trimmed",
        value: trimmed ? "trimmed" : "not trimmed",
        unit: "",
        precision: 0,
        emphasis: false
      },
      {
        id: "disturbanceTendency",
        label: "Disturbance tendency",
        value: tendency,
        unit: "",
        precision: 0,
        emphasis: false
      }
    ];

    let status;
    if (trimmed && tendency === "restoring") {
      status = "pass";
    } else if (!trimmed) {
      status = "neutral";
    } else {
      status = "caution";
    }

    const decision = {
      question: ENGINEERING_QUESTION,
      interpretation: trimmed
        ? `The selected condition is trimmed (|Cm(alpha)| within tolerance), with a ${tendency} disturbance tendency. This linear, quasi-static result does not establish dynamic stability, controllability, or flightworthiness.`
        : `The selected condition is not trimmed (Cm(alpha) is nonzero). Disturbance tendency is ${tendency}. This linear, quasi-static result does not establish dynamic stability, controllability, or flightworthiness.`,
      status
    };

    const plots = [
      {
        id: "cm-alpha",
        title: "Cm vs angle of attack",
        xLabel: "Angle of attack (deg)",
        yLabel: "Cm(alpha)",
        series: [
          {
            id: "cm-alpha-curve",
            label: "Cm(alpha)",
            points: buildCmAlphaSeries(cm0, cmAlphaPerRad, angleOfAttackDeg)
          }
        ],
        referenceLines: [
          { id: "cm-zero", label: "Trim line (Cm = 0)", axis: "y", value: 0 }
        ],
        regions: []
      }
    ];

    return {
      results,
      verificationCases: buildVerificationCases(),
      decision,
      plots,
      scene: null
    };
  }
};

export const model = {
  kind: "derived",
  evaluate(runtimeContext) {
    const aircraft = (runtimeContext && runtimeContext.aircraft) || {};
    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;

    const cmAtAlpha = computeCmAtAlpha(cm0, cmAlphaPerRad, angleOfAttackDeg);
    const trimAngleDeg = computeTrimAngleDeg(cm0, cmAlphaPerRad);
    const deltaCm = computeDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);

    // model.evaluate returns finite calculated values only (per the feature
    // data contract). Classifications ("trimmed", disturbance tendency) and
    // the "not available" trim-angle text are display concerns that belong
    // in analyze()'s results/decision, not here, so a zero-slope or
    // zero-disturbance case never hands the runtime a non-finite value.
    const values = {
      cmAtAlpha,
      deltaCm
    };
    if (typeof trimAngleDeg === "number") {
      values.trimAngleDeg = trimAngleDeg;
    }

    return { values };
  }
};