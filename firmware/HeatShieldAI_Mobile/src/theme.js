// theme.js
// --------
// Same validated color tokens as the web dashboard's styles.css (light
// mode only here -- the web app's light/dark toggle isn't reproduced in
// this mobile preview to keep scope focused on feature parity first).
// Status colors are fixed and never reused for anything else, matching the
// web app's rule.

export const colors = {
  surface: "#fcfcfb",
  page: "#f9f9f7",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  textMuted: "#898781",
  gridline: "#e1e0d9",
  border: "rgba(11, 11, 11, 0.10)",
  series1: "#2a78d6",

  statusGood: "#0ca30c",
  statusWarning: "#fab219",
  statusSerious: "#ec835a",
  statusCritical: "#d03b3b",

  // Brand colors, matched to the Heatshield logo (navy "D" + orange
  // heartbeat) -- used for the login gradient, primary buttons, and the
  // active tab-bar icon. Kept separate from the status palette above,
  // which stays reserved for worker heat-stress state.
  navy: "#0b1f3a",
  navyDark: "#071527",
  accentOrange: "#f57314",
};

export const CLASS_META = [
  { name: "SAFE", label: "Safe", color: colors.statusGood },
  { name: "WARNING", label: "Warning", color: colors.statusWarning },
  { name: "DANGER", label: "Danger", color: colors.statusSerious },
  { name: "CRITICAL", label: "Critical", color: colors.statusCritical },
];

export function statusMeta(predictedClass) {
  if (predictedClass === null || predictedClass === undefined || !CLASS_META[predictedClass]) {
    return { name: "UNKNOWN", label: "No data", color: colors.textMuted };
  }
  return CLASS_META[predictedClass];
}

export const BUCKET_COLOR = {
  low: colors.statusGood,
  moderate: colors.statusWarning,
  high: colors.statusCritical,
};

export const BUCKET_LABEL = { low: "Low", moderate: "Moderate", high: "High" };
