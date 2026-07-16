// routes/workers.js
// ------------------
// Read-side API the dashboard frontend calls. Deliberately the ONLY thing
// the browser ever talks to -- the frontend has no Firebase credentials of
// its own, so all Firestore access is mediated (and rate-limitable,
// auditable, etc.) through this Express layer.

const express = require("express");
const { db } = require("../firebase");
const { dailyAverages, thirtyDayRisk } = require("../heatStrain");

const router = express.Router();

function serializeReading(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    receivedAt: data.receivedAt ? data.receivedAt.toDate().toISOString() : null,
  };
}

// GET /api/workers -- lightweight list for the dashboard's worker grid.
router.get("/", async (req, res) => {
  try {
    const snap = await db.collection("workers").get();
    const workers = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        workerId: doc.id,
        name: data.name || doc.id,
        site: data.site || "Unassigned",
        deviceType: data.deviceType || "real",
        latest: data.latest
          ? {
              ...data.latest,
              receivedAt: data.latest.receivedAt
                ? data.latest.receivedAt.toDate().toISOString()
                : null,
            }
          : null,
        lastSeenAt: data.lastSeenAt ? data.lastSeenAt.toDate().toISOString() : null,
      };
    });
    workers.sort((a, b) => a.workerId.localeCompare(b.workerId));
    res.json({ workers });
  } catch (err) {
    console.error("[workers] list failed:", err);
    res.status(500).json({ error: "Internal error listing workers." });
  }
});

// GET /api/workers/:id -- everything the detail view needs in one call:
// profile, latest reading, recent raw readings, and the last 30 days of
// aggregated history (+ the derived chronic-exposure indicator).
router.get("/:id", async (req, res) => {
  const workerId = req.params.id;
  const workerRef = db.collection("workers").doc(workerId);

  try {
    const workerSnap = await workerRef.get();
    if (!workerSnap.exists) {
      return res.status(404).json({ error: `No worker with id "${workerId}".` });
    }
    const workerData = workerSnap.data();

    const [recentReadingsSnap, dailyStatsSnap] = await Promise.all([
      workerRef.collection("readings").orderBy("receivedAt", "desc").limit(20).get(),
      workerRef.collection("dailyStats").orderBy("date", "desc").limit(30).get(),
    ]);

    const recentReadings = recentReadingsSnap.docs.map(serializeReading);

    // Reverse to ascending (oldest -> newest) since that's what a trend
    // chart wants, and compute per-day averages from the stored sums.
    const dailyStatsAscending = dailyStatsSnap.docs.map((d) => d.data()).reverse();
    const history = dailyStatsAscending.map((stats) => ({
      date: stats.date,
      readingsCount: stats.readingsCount,
      heatStrainDay: stats.heatStrainDay,
      minSpo2Pct: stats.minSpo2Pct,
      maxHeartRateBpm: stats.maxHeartRateBpm,
      classCounts: stats.classCounts,
      ...dailyAverages(stats),
    }));

    const risk = thirtyDayRisk(dailyStatsAscending);

    res.json({
      workerId,
      name: workerData.name || workerId,
      site: workerData.site || "Unassigned",
      deviceType: workerData.deviceType || "real",
      latest: workerData.latest
        ? {
            ...workerData.latest,
            receivedAt: workerData.latest.receivedAt
              ? workerData.latest.receivedAt.toDate().toISOString()
              : null,
          }
        : null,
      lastSeenAt: workerData.lastSeenAt ? workerData.lastSeenAt.toDate().toISOString() : null,
      recentReadings,
      history,
      risk,
    });
  } catch (err) {
    console.error(`[workers] detail failed for "${workerId}":`, err);
    res.status(500).json({ error: "Internal error loading worker detail." });
  }
});

module.exports = router;
