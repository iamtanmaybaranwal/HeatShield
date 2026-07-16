// heatStrain.js
// -------------
// Shared analytics for turning a stream of per-reading heat-stress
// classifications into a 30-day picture per worker. Used by both the live
// ingest route (routes/ingest.js, updating one day at a time as real
// readings arrive) and the dummy-data seed script (scripts/seedDummyWorkers.js,
// computing a full month at once), so the two paths can never disagree on
// what counts as a "heat strain day".
//
// WHY THIS EXISTS (the mentor's ask): HeatShieldAI's on-device TinyML model
// classifies ACUTE heat stress from the current reading only (SAFE/WARNING/
// DANGER/CRITICAL). It has no way to see -- and was never trained to see --
// the cumulative, longer-horizon picture: research on outdoor/construction
// workers links REPEATED occupational heat-strain episodes (elevated core
// temperature + dehydration + exertion, recurring over weeks) to elevated
// risk of acute kidney injury and, with enough recurrence, chronic kidney
// disease of nontraditional origin (see e.g. Occupational Heat Stress and
// Kidney Health, PMC5733743; Occupational heat exposure and the risk of
// chronic kidney disease of nontraditional origin, PMC/PubMed 34161738).
// This module is a simple, transparent, RULE-BASED aggregation layer on top
// of the model's per-reading output -- counting how many of the last 30
// days crossed a meaningful heat-strain threshold -- NOT a second ML model
// and NOT a medical diagnosis. It exists to surface a trend a single
// instantaneous reading can never show, so it's visible on the dashboard.

const CLASS_NAMES = ["SAFE", "WARNING", "DANGER", "CRITICAL"];

function classNameFromIndex(index) {
  return CLASS_NAMES[index] || "UNKNOWN";
}

// A day counts as a "heat strain day" once at least this fraction of that
// day's readings landed in DANGER or CRITICAL -- i.e. a meaningful portion
// of the shift, not one noisy/borderline reading. This is a project-defined
// heuristic threshold (not a clinical cutoff) chosen to flag days worth a
// closer look rather than to diagnose anything.
const HEAT_STRAIN_FRACTION_THRESHOLD = 0.15;

function dateKeyUTC(date) {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD", UTC calendar day
}

function emptyDailyStats(dateKey) {
  return {
    date: dateKey,
    readingsCount: 0,
    sumTemperatureC: 0,
    sumHumidityPct: 0,
    sumHeartRateBpm: 0,
    sumSpo2Pct: 0,
    sumHeatIndexC: 0,
    minSpo2Pct: null,
    maxHeartRateBpm: null,
    classCounts: { SAFE: 0, WARNING: 0, DANGER: 0, CRITICAL: 0 },
    heatStrainDay: false,
  };
}

function computeHeatStrainDay(stats) {
  if (stats.readingsCount === 0) return false;
  const strainCount = stats.classCounts.DANGER + stats.classCounts.CRITICAL;
  return strainCount / stats.readingsCount >= HEAT_STRAIN_FRACTION_THRESHOLD;
}

// Mutates and returns `stats` with one more reading folded in. `reading`
// needs: temperatureC, humidityPct, heartRateBpm, spo2Pct, heatIndexC,
// predictedClass (0-3 index).
function foldReadingIntoDailyStats(stats, reading) {
  stats.readingsCount += 1;
  stats.sumTemperatureC += reading.temperatureC;
  stats.sumHumidityPct += reading.humidityPct;
  stats.sumHeartRateBpm += reading.heartRateBpm;
  stats.sumSpo2Pct += reading.spo2Pct;
  stats.sumHeatIndexC += reading.heatIndexC;

  stats.minSpo2Pct =
    stats.minSpo2Pct === null ? reading.spo2Pct : Math.min(stats.minSpo2Pct, reading.spo2Pct);
  stats.maxHeartRateBpm =
    stats.maxHeartRateBpm === null
      ? reading.heartRateBpm
      : Math.max(stats.maxHeartRateBpm, reading.heartRateBpm);

  const className = classNameFromIndex(reading.predictedClass);
  if (stats.classCounts[className] !== undefined) {
    stats.classCounts[className] += 1;
  }

  stats.heatStrainDay = computeHeatStrainDay(stats);
  return stats;
}

// Derives averages from the running sums -- kept separate from the stored
// document so Firestore only ever stores sums/counts (cheap, atomic
// increments) and averages are computed on read.
function dailyAverages(stats) {
  if (stats.readingsCount === 0) {
    return {
      avgTemperatureC: null,
      avgHumidityPct: null,
      avgHeartRateBpm: null,
      avgSpo2Pct: null,
      avgHeatIndexC: null,
    };
  }
  const n = stats.readingsCount;
  return {
    avgTemperatureC: stats.sumTemperatureC / n,
    avgHumidityPct: stats.sumHumidityPct / n,
    avgHeartRateBpm: stats.sumHeartRateBpm / n,
    avgSpo2Pct: stats.sumSpo2Pct / n,
    avgHeatIndexC: stats.sumHeatIndexC / n,
  };
}

// Summarizes up to 30 daily-stats documents into the dashboard's
// chronic-exposure indicator. Buckets are project-defined severity tiers
// for "how many of the last 30 days crossed the heat-strain threshold
// above", not a medical risk score.
function thirtyDayRisk(dailyStatsArray) {
  const heatStrainDays = dailyStatsArray.filter((d) => d.heatStrainDay).length;

  let bucket = "low";
  let label = "Low cumulative heat-strain exposure this month.";
  if (heatStrainDays >= 7) {
    bucket = "high";
    label =
      "High cumulative heat-strain exposure this month -- recurrent heat strain is " +
      "associated with elevated long-term health risk in outdoor workers; consider " +
      "a medical check-in and reviewing this worker's rest/hydration schedule.";
  } else if (heatStrainDays >= 3) {
    bucket = "moderate";
    label =
      "Moderate cumulative heat-strain exposure this month -- keep an eye on hydration " +
      "and scheduled rest breaks per NIOSH heat-stress guidance.";
  }

  return {
    heatStrainDays,
    totalDays: dailyStatsArray.length,
    bucket,
    label,
  };
}

module.exports = {
  CLASS_NAMES,
  classNameFromIndex,
  HEAT_STRAIN_FRACTION_THRESHOLD,
  dateKeyUTC,
  emptyDailyStats,
  computeHeatStrainDay,
  foldReadingIntoDailyStats,
  dailyAverages,
  thirtyDayRisk,
};
