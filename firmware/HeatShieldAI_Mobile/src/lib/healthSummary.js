// healthSummary.js
// -----------------
// Turns the backend's 4-indicator technical risk breakdown (see
// ../../HeatShieldAI_Dashboard/src/heatStrain.js) into ONE direct verdict:
// is this worker fine this month, or does their 30-day pattern point to
// something worth acting on -- and if so, what, in plain language a
// worker checking their phone on a break can actually read and act on.
//
// The underlying computation is NOT re-derived here -- it reuses exactly
// what the backend already computed (grounded in NIOSH/OSHA/ACGIH
// guidance and CKD-risk research, see that file's comments for sources).
// This module only changes how it's PRESENTED: one direct headline +
// paragraph instead of four jargon-labeled cards.

const CONCERN_PHRASES = {
  heatStrain: {
    label: "sustained heat exposure",
    detail: "Repeated days like this strain your kidneys and raise your risk of heat exhaustion.",
  },
  cardiovascularStrain: {
    label: "your heart working harder than is safe",
    detail: "On multiple days your heart rate reached levels that put real strain on your body.",
  },
  electrolyteRisk: {
    label: "heavy sweating without enough breaks",
    detail: "This raises your risk of muscle cramps and dehydration.",
  },
  dehydrationTrend: {
    label: "a rising heart-rate trend",
    detail:
      "Your heart rate has been climbing for the same amount of effort compared to earlier this month -- an early sign of dehydration building up, even on days that felt normal.",
  },
};

// Returns { headline, tone: 'good'|'warning'|'critical', body, details: [{label, statLine}] }
export function buildHealthSummary(risk) {
  const ind = risk.indicators;
  const concerns = [];

  if (ind.heatStrain.bucket !== "low") {
    concerns.push({
      key: "heatStrain",
      statLine: `${ind.heatStrain.days} of the last ${risk.totalDays} days had extreme heat exposure`,
    });
  }
  if (ind.cardiovascularStrain.bucket !== "low") {
    concerns.push({
      key: "cardiovascularStrain",
      statLine: `${ind.cardiovascularStrain.days} of the last ${risk.totalDays} days your heart rate reached a strain level`,
    });
  }
  if (ind.electrolyteRisk.bucket !== "low") {
    concerns.push({
      key: "electrolyteRisk",
      statLine: `${ind.electrolyteRisk.days} of the last ${risk.totalDays} days had prolonged heavy exertion in the heat`,
    });
  }
  if (ind.dehydrationTrend.status === "rising") {
    concerns.push({
      key: "dehydrationTrend",
      statLine: `Your average heart rate is up ${Math.abs(ind.dehydrationTrend.deltaBpm).toFixed(1)} BPM compared to earlier this month`,
    });
  }

  if (concerns.length === 0) {
    return {
      headline: "You're doing well this month",
      tone: "good",
      body: "Your last 30 days show no signs of concern. Keep drinking water regularly and taking your scheduled breaks in the shade.",
      details: [],
    };
  }

  const tone = risk.bucket === "high" ? "critical" : "warning";
  const headline = tone === "critical" ? "This needs your attention" : "Worth watching closely";
  const namedConcerns = concerns.map((c) => CONCERN_PHRASES[c.key].label);
  const leadDetail = CONCERN_PHRASES[concerns[0].key].detail;

  const joinedConcerns =
    namedConcerns.length === 1
      ? namedConcerns[0]
      : namedConcerns.slice(0, -1).join(", ") + " and " + namedConcerns[namedConcerns.length - 1];

  const closing =
    tone === "critical"
      ? "Talk to your supervisor about adjusting your work/rest schedule and increasing hydration."
      : "Keep a close eye on your water intake and rest breaks for the rest of this month.";

  return {
    headline,
    tone,
    body: `Your last 30 days show ${joinedConcerns}. ${leadDetail} ${closing}`,
    details: concerns.map((c) => ({ label: CONCERN_PHRASES[c.key].label, statLine: c.statLine })),
  };
}
