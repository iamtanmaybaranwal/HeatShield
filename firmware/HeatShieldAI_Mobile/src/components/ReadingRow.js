import React from "react";
import { View, Text, StyleSheet } from "react-native";
import StatusBadge from "./StatusBadge";
import { colors } from "../theme";

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

// A wide 10-column table (as on the web dashboard) doesn't fit a phone
// screen, so recent readings render as a compact card row instead --
// same fields, mobile-appropriate layout.
export default function ReadingRow({ reading }) {
  const time = reading.receivedAt ? new Date(reading.receivedAt).toLocaleString() : "—";
  const gps = reading.gpsFixValid ? `${fmt(reading.latitude, 4)}, ${fmt(reading.longitude, 4)}` : "No GPS fix";
  const link =
    reading.rssi !== null && reading.rssi !== undefined ? `${reading.rssi} dBm / ${fmt(reading.snr, 1)} dB` : "—";

  return (
    <View style={styles.row}>
      <View style={styles.topLine}>
        <Text style={styles.time}>{time}</Text>
        <StatusBadge predictedClass={reading.predictedClass} />
      </View>
      <View style={styles.grid}>
        <Text style={styles.cell}>Temp {fmt(reading.temperatureC)}°C</Text>
        <Text style={styles.cell}>Humidity {fmt(reading.humidityPct)}%</Text>
        <Text style={styles.cell}>HR {reading.fingerPresent ? fmt(reading.heartRateBpm, 0) : "—"}</Text>
        <Text style={styles.cell}>SpO2 {reading.fingerPresent ? fmt(reading.spo2Pct, 0) + "%" : "—"}</Text>
        <Text style={styles.cell}>Heat Index {fmt(reading.heatIndexC)}°C</Text>
        <Text style={styles.cell}>Confidence {fmt(reading.confidencePercent, 0)}%</Text>
      </View>
      <Text style={styles.meta}>{gps} · {link}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gridline,
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  cell: {
    fontSize: 12,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  meta: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
});
