// vitalDescriptors.js
// --------------------
// Turns a raw sensor reading into one short, natural sentence a worker can
// read at a glance -- not a label + bare number + one-word tag. The number
// is always in the sentence; the sentence always says whether that's fine.
//
// Band edges are the SAME thresholds already validated elsewhere in this
// project (not invented fresh here): temperature/heat-index bands line up
// with the NWS/OSHA Heat Index chart categories this project's heat-index
// formula was validated against (see HeatShieldAI/README.md "How Labels
// Are Generated"); heart-rate bands line up with the class-conditional
// ranges the TinyML model was actually trained on (see
// HeatShieldAI/training/generate_dataset.py); SpO2 bands are standard
// clinical normal/low/concerning cutoffs.

import { colors } from "../theme";

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export function describeHeatIndex(celsius) {
  const v = fmt(celsius);
  if (celsius < 27) return { sentence: `It feels like ${v}°C outside — comfortable conditions.`, tone: "good" };
  if (celsius < 37) return { sentence: `It feels like ${v}°C outside — warm, so keep drinking water.`, tone: "warning" };
  if (celsius < 46) return { sentence: `It feels like ${v}°C outside — hot enough to be a real risk.`, tone: "serious" };
  return { sentence: `It feels like ${v}°C outside — dangerously hot right now.`, tone: "critical" };
}

export function describeAirTemperature(celsius) {
  const v = fmt(celsius);
  if (celsius < 25) return { sentence: `The air around you is ${v}°C — nice and comfortable.`, tone: "good" };
  if (celsius < 32) return { sentence: `The air around you is ${v}°C — starting to warm up.`, tone: "warning" };
  if (celsius < 38) return { sentence: `The air around you is ${v}°C — hot out there.`, tone: "serious" };
  return { sentence: `The air around you is ${v}°C — very hot, be careful.`, tone: "critical" };
}

export function describeHumidity(pct) {
  const v = fmt(pct, 0);
  if (pct < 40) return { sentence: `The air is fairly dry at ${v}% humidity.`, tone: "good" };
  if (pct < 60) return { sentence: `Humidity is a comfortable ${v}% right now.`, tone: "good" };
  if (pct < 75) return { sentence: `It's humid — ${v}% — which makes the heat harder on you.`, tone: "warning" };
  return { sentence: `Humidity is very high at ${v}%, making it feel much hotter.`, tone: "serious" };
}

export function describeHeartRate(bpm, fingerPresent) {
  if (!fingerPresent) return { sentence: "No heart-rate reading right now — place a finger on the sensor.", tone: "muted" };
  const v = fmt(bpm, 0);
  if (bpm < 100) return { sentence: `Your heart rate is ${v} BPM — normal.`, tone: "good" };
  if (bpm < 140) return { sentence: `Your heart rate is ${v} BPM — a bit elevated from active work.`, tone: "warning" };
  if (bpm < 160) return { sentence: `Your heart rate is ${v} BPM — running high, consider a break.`, tone: "serious" };
  return { sentence: `Your heart rate is ${v} BPM — very high, you should rest now.`, tone: "critical" };
}

export function describeSpo2(pct, fingerPresent) {
  if (!fingerPresent) return { sentence: "No oxygen reading right now — place a finger on the sensor.", tone: "muted" };
  const v = fmt(pct, 0);
  if (pct >= 95) return { sentence: `Your oxygen level is ${v}% — right where it should be.`, tone: "good" };
  if (pct >= 90) return { sentence: `Your oxygen level is ${v}% — a little lower than normal.`, tone: "warning" };
  return { sentence: `Your oxygen level is ${v}% — low enough to take seriously.`, tone: "critical" };
}

export const TONE_COLOR = {
  good: colors.statusGood,
  warning: colors.statusWarning,
  serious: colors.statusSerious,
  critical: colors.statusCritical,
  muted: colors.textMuted,
};
