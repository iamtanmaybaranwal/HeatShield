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
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../api";
import StatusBadge from "./StatusBadge";
import VitalCard from "./VitalCard";
import HealthSummaryCard from "./HealthSummaryCard";
import TrendChart from "./TrendChart";
import ReadingRow from "./ReadingRow";
import { colors, statusMeta } from "../theme";
import {
  describeHeatIndex,
  describeAirTemperature,
  describeHumidity,
  describeHeartRate,
  describeSpo2,
} from "../lib/vitalDescriptors";
import { buildHealthSummary } from "../lib/healthSummary";

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

const METRICS = [
  { key: "avgHeatIndexC", label: "Feels Like", unit: "°C" },
  { key: "avgTemperatureC", label: "Air Temp", unit: "°C" },
  { key: "avgHeartRateBpm", label: "Heart Rate", unit: "BPM" },
  { key: "avgSpo2Pct", label: "SpO2", unit: "%" },
];

const HERO_COPY = {
  SAFE: "You're safe right now",
  WARNING: "Heat is rising — be cautious",
  DANGER: "Danger — take a break now",
  CRITICAL: "Critical — stop and cool down",
  UNKNOWN: "Waiting for a reading…",
};

export default function WorkerDetailContent({ workerId, showManagement }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [metricIndex, setMetricIndex] = useState(0);
  const [recentOpen, setRecentOpen] = useState(false);
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
          {isWaitingOnRealDevice ? "Waiting for the first reading" : `Couldn't load ${workerId}`}
        </Text>
        <Text style={styles.errorBody}>
          {isWaitingOnRealDevice
            ? "This is the real device — this screen fills in automatically once it sends its first reading."
            : error}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  const { latest } = data;
  const status = statusMeta(latest ? latest.predictedClass : null);
  const summary = buildHealthSummary(data.risk);
  const metric = METRICS[metricIndex];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.workerName}>{data.name}</Text>
        <Text style={styles.workerSite}>{data.site}</Text>
      </View>

      <View style={[styles.heroCard, { backgroundColor: status.color + "14", borderColor: status.color + "40" }]}>
        <View style={styles.heroTop}>
          <View style={[styles.heroDot, { backgroundColor: status.color }]} />
          <Text style={[styles.heroHeadline, { color: status.color }]}>{HERO_COPY[status.name]}</Text>
        </View>
        {latest && (
          <Text style={styles.heroMeta}>{fmt(latest.confidencePercent, 0)}% confidence · updated live</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your vitals right now</Text>
        <View style={styles.vitalsList}>
          <VitalCard icon="thermometer-outline" descriptor={latest ? describeAirTemperature(latest.temperatureC) : null} />
          <VitalCard icon="flame-outline" descriptor={latest ? describeHeatIndex(latest.heatIndexC) : null} />
          <VitalCard icon="water-outline" descriptor={latest ? describeHumidity(latest.humidityPct) : null} />
          <VitalCard icon="heart-outline" descriptor={latest ? describeHeartRate(latest.heartRateBpm, latest.fingerPresent) : null} />
          <VitalCard icon="pulse-outline" descriptor={latest ? describeSpo2(latest.spo2Pct, latest.fingerPresent) : null} />
        </View>
      </View>

      {!data.hideHistory && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your monthly health check</Text>
          <HealthSummaryCard summary={summary} />
        </View>
      )}

      {showManagement && <ManagementPanel data={data} onChanged={load} />}

      {!data.hideHistory && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>This month's pattern</Text>
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
        </View>
      )}

      {!data.hideHistory && (
        <View style={styles.panel}>
          <TouchableOpacity style={styles.recentToggle} onPress={() => setRecentOpen((v) => !v)}>
            <Text style={styles.panelTitle}>Recent activity</Text>
            <Ionicons name={recentOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {recentOpen &&
            (data.recentReadings.length === 0 ? (
              <Text style={styles.mutedText}>No readings yet.</Text>
            ) : (
              data.recentReadings.map((r) => <ReadingRow key={r.id} reading={r} />)
            ))}
        </View>
      )}
    </ScrollView>
  );
}

function ManagementPanel({ data, onChanged }) {
  const [registeredWorkers, setRegisteredWorkers] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
      setPickerOpen(false);
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
      `This deletes all readings and history for ${data.workerId}. This cannot be undone.`,
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
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Device management</Text>

      <View style={styles.allocationRow}>
        <View style={[styles.allocationIcon, { backgroundColor: (isAllocated ? colors.navy : colors.textMuted) + "1a" }]}>
          <Ionicons name={isAllocated ? "person" : "person-outline"} size={18} color={isAllocated ? colors.navy : colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.allocationLabel}>{isAllocated ? "Allocated to" : "Not allocated"}</Text>
          {isAllocated && (
            <Text style={styles.allocationValue}>
              {data.allocatedToName || data.allocatedToPhone} · {data.allocatedToPhone}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.pickerToggle} onPress={() => setPickerOpen((v) => !v)}>
        <Text style={styles.pickerToggleText}>{isAllocated ? "Reassign to someone else" : "Allocate to a worker"}</Text>
        <Ionicons name={pickerOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.navy} />
      </TouchableOpacity>

      {pickerOpen && (
        <View style={styles.pickerList}>
          {registeredWorkers.length === 0 ? (
            <Text style={styles.mutedText}>No registered workers yet.</Text>
          ) : (
            registeredWorkers.map((rw) => {
              const selected = selectedPhone === rw.phoneNumber;
              return (
                <TouchableOpacity
                  key={rw.phoneNumber}
                  style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                  onPress={() => setSelectedPhone(rw.phoneNumber)}
                >
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={selected ? colors.navy : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerRowName}>{rw.name || rw.phoneNumber}</Text>
                    <Text style={styles.pickerRowMeta}>
                      {rw.phoneNumber}
                      {rw.allocatedDeviceId ? ` · currently has ${rw.allocatedDeviceId}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <TouchableOpacity
            style={[styles.btnPrimary, (busy || !selectedPhone) && styles.btnDisabled]}
            onPress={handleAllocate}
            disabled={busy || !selectedPhone}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Confirm allocation</Text>}
          </TouchableOpacity>
        </View>
      )}

      {isAllocated && (
        <TouchableOpacity style={styles.btnSecondary} onPress={handleUnallocate} disabled={busy}>
          <Ionicons name="close-circle-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.btnSecondaryText}>Unallocate</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnDanger} onPress={confirmErase} disabled={busy}>
        <Ionicons name="trash-outline" size={16} color={colors.statusCritical} />
        <Text style={styles.btnDangerText}>Erase all data for this device</Text>
      </TouchableOpacity>

      {mgmtError && <Text style={styles.mgmtError}>{mgmtError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 18 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorTitle: { fontWeight: "700", fontSize: 15, color: colors.textPrimary, marginBottom: 6, textAlign: "center" },
  errorBody: { color: colors.textMuted, fontSize: 12.5, textAlign: "center" },
  header: { marginBottom: -6 },
  workerName: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  workerSite: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  heroCard: { borderWidth: 1, borderRadius: 16, padding: 18 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroDot: { width: 12, height: 12, borderRadius: 6 },
  heroHeadline: { fontSize: 18, fontWeight: "800", flexShrink: 1 },
  heroMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6, marginLeft: 22 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  vitalsList: { gap: 10 },

  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  panelTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 14 },
  recentToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricTabs: { flexDirection: "row", backgroundColor: colors.gridline, borderRadius: 999, padding: 3, marginBottom: 14 },
  metricTab: { flex: 1, paddingVertical: 6, borderRadius: 999, alignItems: "center" },
  metricTabActive: { backgroundColor: colors.surface },
  metricTabText: { fontSize: 11.5, fontWeight: "600", color: colors.textSecondary },
  metricTabTextActive: { color: colors.textPrimary },
  mutedText: { color: colors.textMuted, fontSize: 12.5 },

  allocationRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  allocationIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  allocationLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600", textTransform: "uppercase" },
  allocationValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },

  pickerToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  pickerToggleText: { fontSize: 13, fontWeight: "700", color: colors.navy },
  pickerList: { backgroundColor: colors.page, borderRadius: 10, padding: 8, marginBottom: 10, gap: 4 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 9, borderRadius: 8 },
  pickerRowSelected: { backgroundColor: colors.navy + "12" },
  pickerRowName: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  pickerRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  btnPrimary: { backgroundColor: colors.navy, borderRadius: 9, paddingVertical: 11, alignItems: "center", marginTop: 6 },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingVertical: 11,
    marginBottom: 10,
  },
  btnSecondaryText: { color: colors.textPrimary, fontWeight: "700", fontSize: 13 },
  btnDanger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.statusCritical + "60",
    borderRadius: 9,
    paddingVertical: 11,
  },
  btnDangerText: { color: colors.statusCritical, fontWeight: "700", fontSize: 13 },
  mgmtError: { color: colors.statusCritical, fontSize: 12, marginTop: 10 },
});
