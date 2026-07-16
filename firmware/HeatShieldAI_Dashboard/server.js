// server.js
// ---------
// HeatShieldAI Dashboard backend entry point. Receives worker telemetry
// forwarded by the LoRa gateway (POST /api/ingest), stores it in Firestore,
// serves the read API the dashboard frontend uses (GET /api/workers*), and
// serves the dashboard's static files themselves -- one process, one port.

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "64kb" })); // a reading payload is well under 1KB; generous but bounded

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/ingest", require("./src/routes/ingest"));
app.use("/api/workers", require("./src/routes/workers"));

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HeatShieldAI Dashboard backend listening on http://0.0.0.0:${PORT}`);
  console.log(`  - Dashboard:      http://localhost:${PORT}`);
  console.log(`  - Ingest endpoint: http://localhost:${PORT}/api/ingest (POST)`);
});
