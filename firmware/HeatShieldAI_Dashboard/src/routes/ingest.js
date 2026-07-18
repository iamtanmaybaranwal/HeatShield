// routes/ingest.js
// -----------------
// POST /api/ingest -- the gateway's forward target (see
// ../../HeatShieldAI_Gateway/src/http_forwarder.cpp). Validates one
// reading and hands it to ../ingestWriter.js, which does the actual
// Firestore transaction (shared with src/demoSimulator.js).

const express = require("express");
const { writeReading, isFiniteNumber } = require("../ingestWriter");

const router = express.Router();

const WORKER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function validatePayload(body) {
  const errors = [];

  if (typeof body.workerId !== "string" || !WORKER_ID_PATTERN.test(body.workerId)) {
    errors.push("workerId must be a string matching ^[A-Za-z0-9_-]{1,32}$");
  }
  for (const field of [
    "temperatureC",
    "humidityPct",
    "heartRateBpm",
    "spo2Pct",
    "heatIndexC",
    "confidencePercent",
    "latitude",
    "longitude",
  ]) {
    if (!isFiniteNumber(body[field])) errors.push(`${field} must be a finite number`);
  }
  if (!Number.isInteger(body.predictedClass) || body.predictedClass < 0 || body.predictedClass > 3) {
    errors.push("predictedClass must be an integer 0-3");
  }
  if (typeof body.fingerPresent !== "boolean") errors.push("fingerPresent must be a boolean");
  if (typeof body.gpsFixValid !== "boolean") errors.push("gpsFixValid must be a boolean");

  return errors;
}

// Optional shared-secret check -- only enforced if INGEST_API_KEY is set in
// .env, so the project still runs with zero config out of the box (see
// .env.example).
function checkApiKey(req, res, next) {
  const expected = process.env.INGEST_API_KEY;
  if (!expected) return next(); // not configured -- ingestion stays open
  const provided = req.get("x-api-key");
  if (provided !== expected) {
    return res.status(401).json({ error: "Missing or invalid x-api-key header." });
  }
  next();
}

router.post("/", checkApiKey, async (req, res) => {
  const errors = validatePayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: "Invalid payload", details: errors });
  }

  try {
    await writeReading(req.body.workerId, req.body);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[ingest] Firestore write failed:", err);
    res.status(500).json({ error: "Internal error writing reading." });
  }
});

module.exports = router;
