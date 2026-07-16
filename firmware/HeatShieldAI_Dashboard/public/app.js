// app.js
// ------
// HeatShieldAI Dashboard frontend. Vanilla JS, hash-routed single page:
//   #/                 -> worker grid
//   #/worker/<id>       -> worker detail (map, trend chart, meter, table)
// Talks only to this project's own Express API (never to Firestore
// directly -- no Firebase credentials ever reach the browser).

const root = document.getElementById("app-root");
const headerMeta = document.getElementById("header-meta");

const CLASS_META = [
  { name: "SAFE", label: "Safe", badge: "status-badge--safe" },
  { name: "WARNING", label: "Warning", badge: "status-badge--warning" },
  { name: "DANGER", label: "Danger", badge: "status-badge--danger" },
  { name: "CRITICAL", label: "Critical", badge: "status-badge--critical" },
];

const RISK_BUCKET_COLOR = {
  low: "var(--status-good)",
  moderate: "var(--status-warning)",
  high: "var(--status-critical)",
};

const METRICS = [
  { key: "avgHeatIndexC", label: "Heat Index", unit: "°C" },
  { key: "avgTemperatureC", label: "Temperature", unit: "°C" },
  { key: "avgHeartRateBpm", label: "Heart Rate", unit: "BPM" },
  { key: "avgSpo2Pct", label: "SpO2", unit: "%" },
];

let pollTimer = null;
let mapInstance = null;
let mapMarker = null;
let chartInstance = null;
let activeMetricIndex = 0;

function statusMeta(predictedClass) {
  if (predictedClass === null || predictedClass === undefined || !CLASS_META[predictedClass]) {
    return { name: "UNKNOWN", label: "No data", badge: "status-badge--unknown" };
  }
  return CLASS_META[predictedClass];
}

function statusBadgeHtml(predictedClass, { size } = {}) {
  const meta = statusMeta(predictedClass);
  const sizeAttr = size === "lg" ? ' style="font-size:14px;padding:6px 14px;"' : "";
  return `<span class="status-badge ${meta.badge}"${sizeAttr}><span class="status-badge__dot"></span>${meta.label}</span>`;
}

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

function relativeTime(isoString) {
  if (!isoString) return "never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function route() {
  stopPolling();
  const hash = window.location.hash || "#/";
  const workerMatch = hash.match(/^#\/worker\/([^/]+)$/);
  if (workerMatch) {
    renderDetail(decodeURIComponent(workerMatch[1]));
  } else {
    renderGrid();
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);

// ---------------------------------------------------------------------
// Grid view
// ---------------------------------------------------------------------

async function renderGrid() {
  root.innerHTML = `<div class="spinner-row">Loading workers&hellip;</div>`;
  headerMeta.textContent = "—";

  async function load() {
    let data;
    try {
      data = await apiGet("/api/workers");
    } catch (err) {
      root.innerHTML = `<div class="empty-state"><h3>Couldn't reach the backend</h3><p>${err.message}</p></div>`;
      return;
    }

    let workers = data.workers;
    if (!workers.some((w) => w.workerId === "worker1")) {
      // worker1 is the real device; show a waiting placeholder so it's
      // clear the dashboard is working correctly and just hasn't heard
      // from the hardware yet, rather than looking like it's missing.
      workers = [
        {
          workerId: "worker1",
          name: "worker1",
          site: "Real device",
          deviceType: "real",
          latest: null,
          lastSeenAt: null,
          waiting: true,
        },
        ...workers,
      ];
    }

    headerMeta.textContent = `${workers.length} worker${workers.length === 1 ? "" : "s"} · updated ${new Date().toLocaleTimeString()}`;

    if (workers.length === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <h3>No worker data yet</h3>
          <p>Once the gateway forwards a reading, or you run <code>npm run seed</code> for example workers, they'll show up here.</p>
        </div>`;
      return;
    }

    root.innerHTML = `<div class="worker-grid">${workers.map(workerCardHtml).join("")}</div>`;
    root.querySelectorAll(".worker-card").forEach((card) => {
      card.addEventListener("click", () => {
        window.location.hash = `#/worker/${encodeURIComponent(card.dataset.workerId)}`;
      });
    });
  }

  await load();
  pollTimer = setInterval(load, 5000);
}

function workerCardHtml(worker) {
  const latest = worker.latest;
  return `
    <button class="worker-card" data-worker-id="${worker.workerId}">
      <div class="worker-card__top">
        <div>
          <p class="worker-card__name">${worker.name}</p>
          <p class="worker-card__site">${worker.site}</p>
        </div>
        ${statusBadgeHtml(latest ? latest.predictedClass : null)}
      </div>
      <div class="worker-card__stats">
        <div class="mini-stat">
          <span class="mini-stat__label">Heat Index</span>
          <span class="mini-stat__value">${latest ? fmt(latest.heatIndexC) + "°C" : "—"}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat__label">Heart Rate</span>
          <span class="mini-stat__value">${latest && latest.fingerPresent ? fmt(latest.heartRateBpm, 0) : "—"}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat__label">SpO2</span>
          <span class="mini-stat__value">${latest && latest.fingerPresent ? fmt(latest.spo2Pct, 0) + "%" : "—"}</span>
        </div>
      </div>
      <div class="worker-card__footer">
        <span>${worker.deviceType === "real" ? "Live device" : "Example data"}</span>
        <span>${worker.waiting ? "Waiting for first reading…" : relativeTime(worker.lastSeenAt)}</span>
      </div>
    </button>`;
}

// ---------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------

async function renderDetail(workerId) {
  root.innerHTML = `<div class="spinner-row">Loading ${workerId}&hellip;</div>`;
  headerMeta.textContent = "—";
  activeMetricIndex = 0;

  async function load(isFirstLoad) {
    let w;
    try {
      w = await apiGet(`/api/workers/${encodeURIComponent(workerId)}`);
    } catch (err) {
      const isWaitingOnRealDevice = workerId === "worker1" && /no worker with id/i.test(err.message);
      root.innerHTML = isWaitingOnRealDevice
        ? `
        <div class="empty-state">
          <h3>Waiting for worker1's first reading</h3>
          <p>worker1 is reserved for the real device. This page will populate automatically once the gateway forwards its first reading -- no action needed here.</p>
          <p><a href="#/">&larr; Back to all workers</a></p>
        </div>`
        : `
        <div class="empty-state">
          <h3>Couldn't load ${workerId}</h3>
          <p>${err.message}</p>
          <p><a href="#/">&larr; Back to all workers</a></p>
        </div>`;
      return;
    }

    headerMeta.textContent = `Updated ${new Date().toLocaleTimeString()}`;

    if (isFirstLoad) {
      root.innerHTML = detailShellHtml(w);
      wireDetailInteractions(w);
    } else {
      updateDetailLiveParts(w);
    }
  }

  await load(true);
  pollTimer = setInterval(() => load(false), 5000);
}

function detailShellHtml(w) {
  const latest = w.latest;
  return `
    <div class="detail-header">
      <button class="back-button" id="back-btn">&larr; All workers</button>
      <div>
        <h2>${w.name} <span style="font-weight:400;color:var(--text-muted);font-size:14px;">(${w.workerId})</span></h2>
        <div class="detail-header__site">${w.site} · ${w.deviceType === "real" ? "Live device" : "Example data"}</div>
      </div>
    </div>

    <div class="stat-tile-row" id="stat-tiles">
      ${statTileRowHtml(latest)}
    </div>

    <div class="panel-grid">
      <div class="panel">
        <h3>Location</h3>
        <div id="map"></div>
        <div class="map-caption" id="map-caption">
          ${latest && latest.gpsFixValid ? `${fmt(latest.latitude, 5)}, ${fmt(latest.longitude, 5)} · ${latest.satellites} satellites` : "No GPS fix yet"}
        </div>
      </div>

      <div class="panel">
        <h3>30-day cumulative heat-strain exposure</h3>
        <div class="risk-count">${w.risk.heatStrainDays}<span class="risk-count-unit"> / ${w.risk.totalDays} days</span></div>
        <div class="meter-track">
          <div class="meter-fill" style="width:${Math.min(100, (w.risk.heatStrainDays / 30) * 100)}%;background:${RISK_BUCKET_COLOR[w.risk.bucket]};"></div>
        </div>
        <div class="meter-scale"><span>0</span><span>3 (moderate)</span><span>7 (high)</span><span>30</span></div>
        <p class="risk-label">${w.risk.label}</p>
      </div>
    </div>

    <div class="panel" style="margin-bottom:20px;">
      <h3>
        <span>Trend (last ${w.history.length} days)</span>
        <span class="metric-tabs" id="metric-tabs">
          ${METRICS.map((m, i) => `<button class="metric-tab${i === 0 ? " is-active" : ""}" data-metric-index="${i}">${m.label}</button>`).join("")}
        </span>
      </h3>
      <div class="chart-wrap"><canvas id="trend-chart"></canvas></div>
      <div class="daily-status-strip" id="daily-status-strip"></div>
    </div>

    <div class="panel">
      <h3>Recent readings</h3>
      <div class="readings-table-wrap">
        <table class="readings-table">
          <thead>
            <tr>
              <th>Time</th><th>Status</th><th>Temp</th><th>Humidity</th><th>Heart Rate</th>
              <th>SpO2</th><th>Heat Index</th><th>Confidence</th><th>GPS</th><th>Link (RSSI/SNR)</th>
            </tr>
          </thead>
          <tbody id="readings-tbody">
            ${readingsRowsHtml(w.recentReadings)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function statTileRowHtml(latest) {
  return `
    <div class="stat-tile">
      <div class="stat-tile__label">Status</div>
      <div class="stat-tile__value" style="font-size:16px;">${statusBadgeHtml(latest ? latest.predictedClass : null, { size: "lg" })}</div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile__label">Heat Index</div>
      <div class="stat-tile__value">${latest ? fmt(latest.heatIndexC) : "—"}<span class="stat-tile__unit">°C</span></div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile__label">Temperature</div>
      <div class="stat-tile__value">${latest ? fmt(latest.temperatureC) : "—"}<span class="stat-tile__unit">°C</span></div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile__label">Humidity</div>
      <div class="stat-tile__value">${latest ? fmt(latest.humidityPct) : "—"}<span class="stat-tile__unit">%</span></div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile__label">Heart Rate</div>
      <div class="stat-tile__value">${latest && latest.fingerPresent ? fmt(latest.heartRateBpm, 0) : "—"}<span class="stat-tile__unit">BPM</span></div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile__label">SpO2</div>
      <div class="stat-tile__value">${latest && latest.fingerPresent ? fmt(latest.spo2Pct, 0) : "—"}<span class="stat-tile__unit">%</span></div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile__label">Confidence</div>
      <div class="stat-tile__value">${latest ? fmt(latest.confidencePercent, 0) : "—"}<span class="stat-tile__unit">%</span></div>
    </div>
  `;
}

function readingsRowsHtml(readings) {
  if (!readings || readings.length === 0) {
    return `<tr><td colspan="10" style="color:var(--text-muted);">No readings yet.</td></tr>`;
  }
  return readings
    .map((r) => {
      const time = r.receivedAt ? new Date(r.receivedAt).toLocaleString() : "—";
      const gps = r.gpsFixValid ? `${fmt(r.latitude, 4)}, ${fmt(r.longitude, 4)}` : "—";
      const link = r.rssi !== null && r.rssi !== undefined ? `${r.rssi} dBm / ${fmt(r.snr, 1)} dB` : "—";
      return `
        <tr>
          <td>${time}</td>
          <td>${statusBadgeHtml(r.predictedClass)}</td>
          <td>${fmt(r.temperatureC)}°C</td>
          <td>${fmt(r.humidityPct)}%</td>
          <td>${r.fingerPresent ? fmt(r.heartRateBpm, 0) : "—"}</td>
          <td>${r.fingerPresent ? fmt(r.spo2Pct, 0) + "%" : "—"}</td>
          <td>${fmt(r.heatIndexC)}°C</td>
          <td>${fmt(r.confidencePercent, 0)}%</td>
          <td>${gps}</td>
          <td>${link}</td>
        </tr>`;
    })
    .join("");
}

function wireDetailInteractions(w) {
  document.getElementById("back-btn").addEventListener("click", () => {
    window.location.hash = "#/";
  });

  document.querySelectorAll(".metric-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeMetricIndex = Number(tab.dataset.metricIndex);
      document.querySelectorAll(".metric-tab").forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      renderTrendChart(w.history);
    });
  });

  renderMap(w.latest);
  renderTrendChart(w.history);
  renderDailyStatusStrip(w.history);
}

// Refreshes only the parts of the detail view that change every poll
// (stat tiles, map marker, table) -- avoids tearing down/rebuilding the
// chart and map on every 5s refresh.
function updateDetailLiveParts(w) {
  const statTiles = document.getElementById("stat-tiles");
  if (statTiles) statTiles.innerHTML = statTileRowHtml(w.latest);

  const tbody = document.getElementById("readings-tbody");
  if (tbody) tbody.innerHTML = readingsRowsHtml(w.recentReadings);

  const mapCaption = document.getElementById("map-caption");
  if (mapCaption) {
    mapCaption.textContent =
      w.latest && w.latest.gpsFixValid
        ? `${fmt(w.latest.latitude, 5)}, ${fmt(w.latest.longitude, 5)} · ${w.latest.satellites} satellites`
        : "No GPS fix yet";
  }
  updateMapMarker(w.latest);
}

// ---------------------------------------------------------------------
// Map (Leaflet, OpenStreetMap tiles -- no API key required)
// ---------------------------------------------------------------------

function renderMap(latest) {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  const hasFix = latest && latest.gpsFixValid;
  const center = hasFix ? [latest.latitude, latest.longitude] : [20.5937, 78.9629]; // India centroid fallback
  const zoom = hasFix ? 16 : 4;

  mapInstance = L.map(mapEl).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(mapInstance);

  if (hasFix) {
    mapMarker = L.marker(center).addTo(mapInstance);
  }
}

function updateMapMarker(latest) {
  if (!mapInstance) return;
  const hasFix = latest && latest.gpsFixValid;
  if (!hasFix) return;
  const center = [latest.latitude, latest.longitude];
  if (mapMarker) {
    mapMarker.setLatLng(center);
  } else {
    mapMarker = L.marker(center).addTo(mapInstance);
  }
  mapInstance.panTo(center);
}

// ---------------------------------------------------------------------
// Trend chart (Chart.js) -- single metric at a time (never dual-axis)
// ---------------------------------------------------------------------

function renderTrendChart(history) {
  const canvas = document.getElementById("trend-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const metric = METRICS[activeMetricIndex];
  const labels = history.map((d) => d.date.slice(5)); // "MM-DD"
  const values = history.map((d) => d[metric.key]);

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${metric.label} (${metric.unit})`,
          data: values,
          borderColor: cssVar("--series-1"),
          backgroundColor: cssVar("--series-1") + "1a",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: cssVar("--series-1"),
          pointBorderColor: cssVar("--surface-1"),
          pointBorderWidth: 2,
          tension: 0.25,
          fill: true,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${metric.label}: ${fmt(ctx.parsed.y)} ${metric.unit}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: cssVar("--gridline") },
          ticks: { color: cssVar("--text-muted"), maxRotation: 0, autoSkip: true },
        },
        y: {
          grid: { color: cssVar("--gridline") },
          ticks: { color: cssVar("--text-muted") },
        },
      },
    },
  });
}

function renderDailyStatusStrip(history) {
  const strip = document.getElementById("daily-status-strip");
  if (!strip) return;

  strip.innerHTML = history
    .map((day) => {
      const dominant = dominantClassIndex(day.classCounts);
      const meta = statusMeta(dominant);
      const color =
        meta.name === "SAFE"
          ? "var(--status-good)"
          : meta.name === "WARNING"
            ? "var(--status-warning)"
            : meta.name === "DANGER"
              ? "var(--status-serious)"
              : meta.name === "CRITICAL"
                ? "var(--status-critical)"
                : "var(--gridline)";
      const title = `${day.date}: mostly ${meta.label}${day.heatStrainDay ? " — heat-strain day" : ""}`;
      return `<div class="daily-status-dot" style="background:${color};" title="${title}"></div>`;
    })
    .join("");
}

function dominantClassIndex(classCounts) {
  if (!classCounts) return null;
  let bestIndex = null;
  let bestCount = -1;
  CLASS_META.forEach((meta, i) => {
    const count = classCounts[meta.name] || 0;
    if (count > bestCount) {
      bestCount = count;
      bestIndex = i;
    }
  });
  return bestCount > 0 ? bestIndex : null;
}
