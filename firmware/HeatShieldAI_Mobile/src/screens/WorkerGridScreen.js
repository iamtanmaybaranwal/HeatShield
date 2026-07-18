import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiRequest } from "../api";
import StatusBadge from "../components/StatusBadge";
import { colors } from "../theme";

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

function relativeTime(isoString) {
  if (!isoString) return "never";
  const diffSec = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default function WorkerGridScreen({ navigation }) {
  const [workers, setWorkers] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async (isManualRefresh) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await apiRequest("/api/workers");
      let list = data.workers;
      if (!list.some((w) => w.workerId === "worker1")) {
        list = [
          { workerId: "worker1", name: "worker1", site: "Real device", deviceType: "real", latest: null, lastSeenAt: null, waiting: true },
          ...list,
        ];
      }
      setWorkers(list);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
      pollRef.current = setInterval(() => load(false), 5000);
      return () => clearInterval(pollRef.current);
    }, [load])
  );

  if (error && !workers) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't reach the backend</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!workers) {
    return (
      <View style={styles.centered}>
        <Text style={styles.mutedText}>Loading workers…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={workers}
      keyExtractor={(w) => w.workerId}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      renderItem={({ item: w }) => {
        const latest = w.latest;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("WorkerDetail", { workerId: w.workerId })}
          >
            <View style={styles.cardTop}>
              <View style={styles.flexShrink}>
                <Text style={styles.cardName}>{w.name}</Text>
                <Text style={styles.cardSite}>{w.site}</Text>
              </View>
              <StatusBadge predictedClass={latest ? latest.predictedClass : null} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>Heat Index</Text>
                <Text style={styles.miniStatValue}>{latest ? fmt(latest.heatIndexC) + "°C" : "—"}</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>Heart Rate</Text>
                <Text style={styles.miniStatValue}>
                  {latest && latest.fingerPresent ? fmt(latest.heartRateBpm, 0) : "—"}
                </Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>SpO2</Text>
                <Text style={styles.miniStatValue}>
                  {latest && latest.fingerPresent ? fmt(latest.spo2Pct, 0) + "%" : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.footerText} numberOfLines={1}>
                {w.allocatedToName || w.allocatedToPhone
                  ? `Allocated: ${w.allocatedToName || w.allocatedToPhone}`
                  : w.deviceType === "real"
                    ? "Live device"
                    : "Example data"}
              </Text>
              <Text style={styles.footerText}>{w.waiting ? "Waiting…" : relativeTime(w.lastSeenAt)}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.mutedText}>
            No worker data yet. Once the gateway forwards a reading, or the backend's example workers are
            seeded, they'll show up here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  mutedText: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  errorTitle: { fontWeight: "700", fontSize: 15, color: colors.textPrimary, marginBottom: 6 },
  errorBody: { color: colors.textMuted, fontSize: 12.5, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  flexShrink: { flexShrink: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  cardSite: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  miniStat: { gap: 2 },
  miniStatLabel: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase" },
  miniStatValue: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
});
