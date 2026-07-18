import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { apiRequest } from "../api";
import StatusBadge from "./StatusBadge";
import StatTile from "./StatTile";
import DeviceMap from "./DeviceMap";
import RiskIndicatorCard from "./RiskIndicatorCard";
import TrendChart from "./TrendChart";
import ReadingRow from "./ReadingRow";
import { colors, BUCKET_COLOR, BUCKET_LABEL } from "../theme";

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

const METRICS = [
  { key: "avgHeatIndexC", label: "Heat Index", unit: "°C" },
  { key: "avgTemperatureC", label: "Temperature", unit: "°C" },
  { key: "avgHeartRateBpm", label: "Heart Rate", unit: "BPM" },
  { key: "avgSpo2Pct", label: "SpO2", unit: "%" },
];

const HEAT_EXPOSURE_CONDITIONS = [
  "Heat stress", "Heat exhaustion", "Chronic dehydration", "Fatigue",
  "Electrolyte imbalance", "Muscle cramps", "Cardiovascular stress",
  "Kidney stress", "Reduced productivity", "Increased absenteeism",
];

export default function WorkerDetailContent({ workerId, showManagement }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [metricIndex, setMetricIndex] = useState(0);
  const [whyExpanded, setWhyExpanded] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const w = await apiRequest(`/api/workers/${encodeURIComponent(workerId)}`);
      setData(w);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [workerId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  if (error && !data) {
    const isWaitingOnRealDevice = workerId === "worker1" && /no worker with id/i.test(error);
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          {isWaitingOnRealDevice ? "Waiting for worker1's first reading" : `Couldn't load ${workerId}`}
        </Text>
        <Text style={styles.errorBody}>
          {isWaitingOnRealDevice
            ? "worker1 is reserved for the real device. This screen will populate automatically once the gateway forwards its first reading."
            : error}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.series1} />
      </View>
    );
  }

  const { latest, risk } = data;
  const ind = risk.indicators;
  const metric = METRICS[metricIndex];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.workerName}>
          {data.name} <Text style={styles.workerIdText}>({data.workerId})</Text>
        </Text>
        <Text style={styles.workerSite}>
          {data.site} · {data.deviceType === "real" ? "Live device" : "Example data"}
        </Text>
      </View>

      <View style={styles.statGrid}>
        <StatTile label="Status">
          <StatusBadge predictedClass={latest ? latest.predictedClass : null} size="lg" />
        </StatTile>
        <StatTile label="Heat Index" value={latest ? fmt(latest.heatIndexC) : "—"} unit="°C" />
        <StatTile label="Temperature" value={latest ? fmt(latest.temperatureC) : "—"} unit="°C" />
        <StatTile label="Humidity" value={latest ? fmt(latest.humidityPct) : "—"} unit="%" />
        <StatTile
          label="Heart Rate"
          value={latest && latest.fingerPresent ? fmt(latest.heartRateBpm, 0) : "—"}
          unit="BPM"
        />
        <StatTile
          label="SpO2"
          value={latest && latest.fingerPresent ? fmt(latest.spo2Pct, 0) : "—"}
          unit="%"
        />
        <StatTile label="Confidence" value={latest ? fmt(latest.confidencePercent, 0) : "—"} unit="%" />
      </View>

      <Panel title="Location">
        <DeviceMap latest={latest} />
      </Panel>

      <Panel title="30-day overall risk">
        <Text style={[styles.bigRisk, { color: BUCKET_COLOR[risk.bucket] }]}>
          {BUCKET_LABEL[risk.bucket]} <Text style={styles.bigRiskUnit}>over {risk.totalDays} days</Text>
        </Text>
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              { width: `${Math.min(100, (risk.heatStrainDays / 30) * 100)}%`, backgroundColor: BUCKET_COLOR[risk.bucket] },
            ]}
          />
        </View>
        <Text style={styles.riskCaption}>Worst of the 4 indicators below — see the full breakdown for specifics.</Text>
      </Panel>

      <Panel title="Long-term heat-exposure risk indicators">
        <Text style={styles.riskIntro}>
          A single reading can look fine even while strain quietly builds up over weeks. These four indicators
          are computed from this device's stored history — they flag risk patterns, they do not diagnose any
          condition.
        </Text>
        <View style={styles.indicatorGrid}>
          <RiskIndicatorCard
            title={ind.heatStrain.title}
            bucket={ind.heatStrain.bucket}
            valueText={String(ind.heatStrain.days)}
            valueUnit="/ 30 days"
            description={ind.heatStrain.description}
          />
          <RiskIndicatorCard
            title={ind.cardiovascularStrain.title}
            bucket={ind.cardiovascularStrain.bucket}
            valueText={String(ind.cardiovascularStrain.days)}
            valueUnit="/ 30 days"
            description={ind.cardiovascularStrain.description}
          />
          <RiskIndicatorCard
            title={ind.electrolyteRisk.title}
            bucket={ind.electrolyteRisk.bucket}
            valueText={String(ind.electrolyteRisk.days)}
            valueUnit="/ 30 days"
            description={ind.electrolyteRisk.description}
          />
          <RiskIndicatorCard
            title={ind.dehydrationTrend.title}
            bucket={ind.dehydrationTrend.bucket}
            valueText={
              ind.dehydrationTrend.status === "insufficient_data"
                ? "—"
                : (ind.dehydrationTrend.deltaBpm >= 0 ? "+" : "") + fmt(ind.dehydrationTrend.deltaBpm, 1)
            }
            valueUnit={ind.dehydrationTrend.status === "insufficient_data" ? "" : "BPM"}
            description={ind.dehydrationTrend.description}
          />
        </View>

        <TouchableOpacity onPress={() => setWhyExpanded((v) => !v)} style={styles.whyToggle}>
          <Text style={styles.whyToggleText}>{whyExpanded ? "▾" : "▸"} Why this matters</Text>
        </TouchableOpacity>
        {whyExpanded && (
          <View style={styles.whyBody}>
            <Text style={styles.whyText}>
              Heat stroke is only the final, acute stage. The real problem is that workers can spend 8-10 hours
              a day under extreme heat, which causes continuous physiological stress. Over weeks and months,
              that repeated stress is linked to:
            </Text>
            <View style={styles.chipRow}>
              {HEAT_EXPOSURE_CONDITIONS.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.whyText}>
              HeatShieldAI is <Text style={styles.bold}>not diagnosing any of these.</Text> The on-device model
              only ever classifies the current reading. The four indicators above are a transparent, rule-based
              layer on top of that — identifying risk patterns and early warning trends from this device's
              history, before health visibly deteriorates. Reduced productivity and absenteeism are real
              downstream costs but aren't measurable by this wearable, so they aren't tracked as metrics here.
            </Text>
          </View>
        )}
      </Panel>

      {showManagement && <ManagementPanel data={data} onChanged={load} />}

      <Panel title={`Trend (last ${data.history.length} days)`}>
        <View style={styles.metricTabs}>
          {METRICS.map((m, i) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.metricTab, i === metricIndex && styles.metricTabActive]}
              onPress={() => setMetricIndex(i)}
            >
              <Text style={[styles.metricTabText, i === metricIndex && styles.metricTabTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TrendChart history={data.history} metricKey={metric.key} metricLabel={metric.label} metricUnit={metric.unit} />
      </Panel>

      <Panel title="Recent readings">
        {data.recentReadings.length === 0 ? (
          <Text style={styles.mutedText}>No readings yet.</Text>
        ) : (
          data.recentReadings.map((r) => <ReadingRow key={r.id} reading={r} />)
        )}
      </Panel>
    </ScrollView>
  );
}

function Panel({ title, children }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ManagementPanel({ data, onChanged }) {
  const [registeredWorkers, setRegisteredWorkers] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mgmtError, setMgmtError] = useState(null);

  useEffect(() => {
    apiRequest("/api/supervisor/registered-workers")
      .then(({ workers }) => {
        setRegisteredWorkers(workers);
        if (workers.length > 0) setSelectedPhone(workers[0].phoneNumber);
      })
      .catch((err) => setMgmtError(err.message));
  }, []);

  async function handleAllocate() {
    if (!selectedPhone) return;
    setBusy(true);
    setMgmtError(null);
    try {
      await apiRequest("/api/supervisor/allocate", {
        method: "POST",
        body: { workerId: data.workerId, phoneNumber: selectedPhone },
      });
      await onChanged();
    } catch (err) {
      setMgmtError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnallocate() {
    setBusy(true);
    setMgmtError(null);
    try {
      await apiRequest("/api/supervisor/unallocate", { method: "POST", body: { workerId: data.workerId } });
      await onChanged();
    } catch (err) {
      setMgmtError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmErase() {
    Alert.alert(
      "Erase all data?",
      `This deletes all readings and history for ${data.workerId}. This cannot be undone. The device profile and allocation stay intact.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Erase", style: "destructive", onPress: handleErase },
      ]
    );
  }

  async function handleErase() {
    setBusy(true);
    setMgmtError(null);
    try {
      await apiRequest("/api/supervisor/erase", { method: "POST", body: { workerId: data.workerId } });
      await onChanged();
    } catch (err) {
      setMgmtError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isAllocated = !!data.allocatedToPhone;

  return (
    <Panel title="Device management">
      <Text style={styles.allocationStatus}>
        {isAllocated ? (
          <>
            Allocated to <Text style={styles.bold}>{data.allocatedToName || data.allocatedToPhone}</Text> (
            {data.allocatedToPhone})
          </>
        ) : (
          "Not allocated to any worker."
        )}
      </Text>

      {registeredWorkers.length === 0 ? (
        <Text style={styles.mutedText}>No registered workers yet.</Text>
      ) : (
        <View style={styles.pickerRow}>
          {registeredWorkers.map((rw) => (
            <TouchableOpacity
              key={rw.phoneNumber}
              style={[styles.pickerChip, selectedPhone === rw.phoneNumber && styles.pickerChipActive]}
              onPress={() => setSelectedPhone(rw.phoneNumber)}
            >
              <Text
                style={[styles.pickerChipText, selectedPhone === rw.phoneNumber && styles.pickerChipTextActive]}
              >
                {rw.name || rw.phoneNumber}
                {rw.allocatedDeviceId ? ` (has: ${rw.allocatedDeviceId})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.mgmtButtonRow}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleAllocate} disabled={busy || !selectedPhone}>
          <Text style={styles.btnPrimaryText}>Allocate</Text>
        </TouchableOpacity>
        {isAllocated && (
          <TouchableOpacity style={styles.btnSecondary} onPress={handleUnallocate} disabled={busy}>
            <Text style={styles.btnSecondaryText}>Unallocate</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.btnDanger} onPress={confirmErase} disabled={busy}>
        <Text style={styles.btnDangerText}>Erase all data for this device</Text>
      </TouchableOpacity>

      {mgmtError && <Text style={styles.mgmtError}>{mgmtError}</Text>}
      {busy && <ActivityIndicator style={{ marginTop: 8 }} color={colors.series1} />}
    </Panel>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorTitle: { fontWeight: "700", fontSize: 15, color: colors.textPrimary, marginBottom: 6, textAlign: "center" },
  errorBody: { color: colors.textMuted, fontSize: 12.5, textAlign: "center" },
  header: { marginBottom: 4 },
  workerName: { fontSize: 19, fontWeight: "700", color: colors.textPrimary },
  workerIdText: { fontWeight: "400", color: colors.textMuted, fontSize: 13 },
  workerSite: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
  },
  panelTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  bigRisk: { fontSize: 24, fontWeight: "700" },
  bigRiskUnit: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
  meterTrack: { height: 10, borderRadius: 999, backgroundColor: colors.gridline, overflow: "hidden", marginTop: 10, marginBottom: 8 },
  meterFill: { height: "100%", borderRadius: 999 },
  riskCaption: { fontSize: 12.5, color: colors.textSecondary },
  riskIntro: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 },
  indicatorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  whyToggle: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gridline },
  whyToggleText: { color: colors.series1, fontWeight: "600", fontSize: 13 },
  whyBody: { marginTop: 10 },
  whyText: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  bold: { fontWeight: "700", color: colors.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: { backgroundColor: colors.gridline, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { fontSize: 11, color: colors.textSecondary },
  metricTabs: { flexDirection: "row", backgroundColor: colors.gridline, borderRadius: 999, padding: 3, marginBottom: 14 },
  metricTab: { flex: 1, paddingVertical: 6, borderRadius: 999, alignItems: "center" },
  metricTabActive: { backgroundColor: colors.surface },
  metricTabText: { fontSize: 11.5, fontWeight: "600", color: colors.textSecondary },
  metricTabTextActive: { color: colors.textPrimary },
  mutedText: { color: colors.textMuted, fontSize: 12.5 },
  allocationStatus: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  pickerChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  pickerChipActive: { backgroundColor: colors.series1, borderColor: colors.series1 },
  pickerChipText: { fontSize: 12, color: colors.textSecondary },
  pickerChipTextActive: { color: "#fff", fontWeight: "600" },
  mgmtButtonRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  btnPrimary: { backgroundColor: colors.series1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  btnSecondary: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  btnSecondaryText: { color: colors.textPrimary, fontWeight: "600", fontSize: 12.5 },
  btnDanger: { borderWidth: 1, borderColor: colors.statusCritical, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  btnDangerText: { color: colors.statusCritical, fontWeight: "700", fontSize: 12.5 },
  mgmtError: { color: colors.statusCritical, fontSize: 12, marginTop: 8 },
});
