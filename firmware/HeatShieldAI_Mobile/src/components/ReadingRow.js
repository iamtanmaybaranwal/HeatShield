import React from "react";
import { View, Text, StyleSheet } from "react-native";
import StatusBadge from "./StatusBadge";
import { colors } from "../theme";

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

function timeOnly(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// One past reading, in the same plain-language spirit as the vitals cards
// above -- a time, a status, and the key numbers, nothing that reads like
// raw telemetry (no coordinates, no radio link stats).
export default function ReadingRow({ reading }) {
  return (
    <View style={styles.row}>
      <Text style={styles.time}>{timeOnly(reading.receivedAt)}</Text>
      <View style={styles.middle}>
        <Text style={styles.summary}>
          {fmt(reading.heatIndexC)}°C feels like · {reading.fingerPresent ? `${fmt(reading.heartRateBpm, 0)} BPM` : "no HR reading"}
        </Text>
      </View>
      <StatusBadge predictedClass={reading.predictedClass} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.gridline,
  },
  time: { fontSize: 12, color: colors.textMuted, width: 56, fontVariant: ["tabular-nums"] },
  middle: { flex: 1 },
  summary: { fontSize: 12.5, color: colors.textPrimary, fontWeight: "500" },
});
