// ingestWriter.js
// -----------------
// The actual "write one reading" transaction, extracted out of
// routes/ingest.js so it has exactly one implementation shared by two
// callers: the real HTTP endpoint (a gateway posting a genuine reading)
// and src/demoSimulator.js (a synthetic backup reading generator for demo
// purposes -- see that file for why it exists). Both need to behave
// identically -- same Firestore writes, same dailyStats folding -- so
// there is deliberately only one copy of this logic.

const { db, admin } = require("./firebase");
const { dateKeyUTC, emptyDailyStats, foldReadingIntoDailyStats } = require("./heatStrain");

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// `fields` needs: temperatureC, humidityPct, heartRateBpm, spo2Pct,
// heatIndexC, fingerPresent, predictedClass, confidencePercent, latitude,
// longitude, gpsFixValid, plus optional sequenceNumber/satellites/rssi/snr.
async function writeReading(workerId, fields) {
  const now = new Date();
  const dayKey = dateKeyUTC(now);

  const workerRef = db.collection("workers").doc(workerId);
  const readingRef = workerRef.collection("readings").doc();
  const dailyStatsRef = workerRef.collection("dailyStats").doc(dayKey);

  const reading = {
    receivedAt: admin.firestore.Timestamp.fromDate(now),
    sequenceNumber: isFiniteNumber(fields.sequenceNumber) ? fields.sequenceNumber : null,
    temperatureC: fields.temperatureC,
    humidityPct: fields.humidityPct,
    heartRateBpm: fields.heartRateBpm,
    spo2Pct: fields.spo2Pct,
    heatIndexC: fields.heatIndexC,
    fingerPresent: fields.fingerPresent,
    predictedClass: fields.predictedClass,
    confidencePercent: fields.confidencePercent,
    latitude: fields.latitude,
    longitude: fields.longitude,
    gpsFixValid: fields.gpsFixValid,
    satellites: Number.isInteger(fields.satellites) ? fields.satellites : 0,
    rssi: isFiniteNumber(fields.rssi) ? fields.rssi : null,
    snr: isFiniteNumber(fields.snr) ? fields.snr : null,
  };

  await db.runTransaction(async (tx) => {
    const [workerSnap, dailyStatsSnap] = await Promise.all([tx.get(workerRef), tx.get(dailyStatsRef)]);

    const stats = dailyStatsSnap.exists ? dailyStatsSnap.data() : emptyDailyStats(dayKey);
    foldReadingIntoDailyStats(stats, reading);

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

  return reading;
}

module.exports = { writeReading, isFiniteNumber };
