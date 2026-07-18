// routes/ingest.js
// -----------------
// POST /api/ingest -- the gateway's forward target (see
// ../../HeatShieldAI_Gateway/src/http_forwarder.cpp). Validates one
// reading, writes it to Firestore, and updates that worker's running daily
// aggregate in the same transaction so the dashboard never has to scan raw
// readings to build the 30-day view.

const express = require("express");
const { db, admin } = require("../firebase");
const {
  dateKeyUTC,
  emptyDailyStats,
  foldReadingIntoDailyStats,
} = require("../heatStrain");

const router = express.Router();

const WORKER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

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

  const body = req.body;
  const workerId = body.workerId;
  const now = new Date();
  const dayKey = dateKeyUTC(now);

  const workerRef = db.collection("workers").doc(workerId);
  const readingRef = workerRef.collection("readings").doc();
  const dailyStatsRef = workerRef.collection("dailyStats").doc(dayKey);

  const reading = {
    receivedAt: admin.firestore.Timestamp.fromDate(now),
    sequenceNumber: isFiniteNumber(body.sequenceNumber) ? body.sequenceNumber : null,
    temperatureC: body.temperatureC,
    humidityPct: body.humidityPct,
    heartRateBpm: body.heartRateBpm,
    spo2Pct: body.spo2Pct,
    heatIndexC: body.heatIndexC,
    fingerPresent: body.fingerPresent,
    predictedClass: body.predictedClass,
    confidencePercent: body.confidencePercent,
    latitude: body.latitude,
    longitude: body.longitude,
    gpsFixValid: body.gpsFixValid,
    satellites: Number.isInteger(body.satellites) ? body.satellites : 0,
    rssi: isFiniteNumber(body.rssi) ? body.rssi : null,
    snr: isFiniteNumber(body.snr) ? body.snr : null,
  };

  try {
    await db.runTransaction(async (tx) => {
      const [workerSnap, dailyStatsSnap] = await Promise.all([
        tx.get(workerRef),
        tx.get(dailyStatsRef),
      ]);

      const stats = dailyStatsSnap.exists ? dailyStatsSnap.data() : emptyDailyStats(dayKey);
      foldReadingIntoDailyStats(stats, reading);

      // Single merge-write per document (rather than a separate create +
      // update on workerRef) so this is correct regardless of whether the
      // worker doc already existed -- an upsert, not a create-then-patch.
      const workerUpdate = {
        latest: reading,
        lastSeenAt: admin.firestore.Timestamp.fromDate(now),
      };
      if (!workerSnap.exists) {
        workerUpdate.name = workerId;
        workerUpdate.site = "Unassigned";
        workerUpdate.deviceType = "real";
        workerUpdate.createdAt = admin.firestore.Timestamp.fromDate(now);
      }

      tx.set(readingRef, reading);
      tx.set(dailyStatsRef, stats);
      tx.set(workerRef, workerUpdate, { merge: true });
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[ingest] Firestore write failed:", err);
    res.status(500).json({ error: "Internal error writing reading." });
  }
});

module.exports = router;
