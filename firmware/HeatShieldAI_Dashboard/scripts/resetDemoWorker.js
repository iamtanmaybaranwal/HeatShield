// resetDemoWorker.js
// --------------------
// One-off: turns worker2 from a static 30-day seeded example into the
// live hardware-failure backup demo worker -- renames it to "Worker",
// wipes its old seeded readings/history (so its 30-day view starts clean
// rather than showing the old fake month), and marks it as a live device.
// Actual live data comes from src/demoSimulator.js once
// DEMO_SIMULATOR_ENABLED=1 is set and the server is running -- this script
// only resets the profile/history, it doesn't start writing readings.
//
// Run with: node scripts/resetDemoWorker.js
// Safe to re-run.

require("dotenv").config();

const { db, admin } = require("../src/firebase");
const { deleteSubcollection } = require("../src/firestoreUtils");

const WORKER_ID = process.env.DEMO_SIMULATOR_WORKER_ID || "worker2";

async function main() {
  const workerRef = db.collection("workers").doc(WORKER_ID);
  const snap = await workerRef.get();
  if (!snap.exists) {
    console.log(`[reset] "${WORKER_ID}" doesn't exist yet -- creating a clean profile for it.`);
  } else {
    console.log(`[reset] Wiping existing readings/history for "${WORKER_ID}"...`);
    const deletedReadings = await deleteSubcollection(workerRef.collection("readings"));
    const deletedDailyStats = await deleteSubcollection(workerRef.collection("dailyStats"));
    console.log(`[reset] Deleted ${deletedReadings} readings, ${deletedDailyStats} daily-stats docs.`);
  }

  await workerRef.set(
    {
      name: "Worker",
      site: "Site B - Warehouse Expansion",
      deviceType: "real",
      latest: null,
      lastSeenAt: null,
      // This worker has no genuine 30-day history (it's a live-only backup
      // -- see file header), so the app skips the health-check card, trend
      // chart, and recent-activity log entirely rather than showing a
      // near-empty or misleading "history" for a device that just started.
      hideHistory: true,
    },
    { merge: true }
  );

  console.log(`[reset] "${WORKER_ID}" is now named "Worker" with a clean history.`);
  console.log(`[reset] Set DEMO_SIMULATOR_ENABLED=1 in .env and restart the server to start live readings.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[reset] Failed:", err);
  process.exit(1);
});
