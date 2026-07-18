// demoSimulator.js
// -----------------
// Backup-demo data generator. WHY THIS EXISTS: if the physical wearable
// fails during a live demo, there needs to be a device that behaves
// EXACTLY like a real one -- polling, live-updating, backed by real
// Firestore writes -- rather than a static seeded snapshot. This writes a
// fresh synthetic reading every ~10 seconds for one worker, reusing the
// exact same write path (ingestWriter.js) a genuine gateway POST uses, so
// the dashboard/app can't tell the difference.
//
// Values are deliberately kept inside ordinary indoor/ambient conditions
// (see the constants below) -- this is a "the hardware is fine, everyday
// conditions" demo, not a fabricated emergency, so it should read SAFE the
// entire time, same as a real person sitting in a normal room would.
//
// Opt-in only: does nothing unless DEMO_SIMULATOR_ENABLED=1 is set (see
// .env.example). Off by default so a fresh clone doesn't silently write
// fake data into someone's Firestore.

const { writeReading } = require("./ingestWriter");

const INTERVAL_MS = 10000;

// Average mild-indoor conditions (see the request this was built for:
// "average Indian household conditions").
const TEMPERATURE_RANGE_C = [21.5, 22.5];
const HUMIDITY_RANGE_PCT = [45, 55];
const HEART_RATE_RANGE_BPM = [75, 80];
const SPO2_RANGE_PCT = [97, 99];
const CONFIDENCE_RANGE_PCT = [92, 99];

function randomInRange([min, max]) {
  return min + Math.random() * (max - min);
}

// Same Australian BOM Apparent Temperature formula used everywhere else in
// this project (training/common.py, scripts/syntheticPhysiology.js) -- kept
// consistent rather than re-derived so this reading is physically the same
// kind of number a real node would compute.
function heatIndexCelsius(tempC, rhPct) {
  const e = (rhPct / 100.0) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return tempC + 0.33 * e - 4.0;
}

function buildReading(sequenceNumber) {
  const temperatureC = randomInRange(TEMPERATURE_RANGE_C);
  const humidityPct = randomInRange(HUMIDITY_RANGE_PCT);
  return {
    sequenceNumber,
    temperatureC: Math.round(temperatureC * 100) / 100,
    humidityPct: Math.round(humidityPct * 100) / 100,
    heartRateBpm: Math.round(randomInRange(HEART_RATE_RANGE_BPM) * 10) / 10,
    spo2Pct: Math.round(randomInRange(SPO2_RANGE_PCT) * 10) / 10,
    heatIndexC: Math.round(heatIndexCelsius(temperatureC, humidityPct) * 100) / 100,
    fingerPresent: true,
    predictedClass: 0, // SAFE -- these ranges never leave the SAFE band (see file header)
    confidencePercent: Math.round(randomInRange(CONFIDENCE_RANGE_PCT) * 10) / 10,
    latitude: 0,
    longitude: 0,
    gpsFixValid: false,
    satellites: 0,
    rssi: -50 - Math.round(Math.random() * 20),
    snr: Math.round((8 + Math.random() * 5) * 10) / 10,
  };
}

function startDemoSimulator() {
  if (process.env.DEMO_SIMULATOR_ENABLED !== "1") return;

  const workerId = process.env.DEMO_SIMULATOR_WORKER_ID || "worker2";
  let sequenceNumber = 0;

  console.log(`[demoSimulator] Enabled -- writing a synthetic reading for "${workerId}" every ${INTERVAL_MS / 1000}s.`);

  const tick = async () => {
    sequenceNumber += 1;
    try {
      await writeReading(workerId, buildReading(sequenceNumber));
    } catch (err) {
      console.error("[demoSimulator] Write failed:", err);
    }
  };

  tick(); // write one immediately on boot instead of waiting a full interval
  setInterval(tick, INTERVAL_MS);
}

module.exports = { startDemoSimulator };
