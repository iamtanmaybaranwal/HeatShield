import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, BUCKET_COLOR, BUCKET_LABEL } from "../theme";

// Renders one of the four long-term risk indicators from GET
// /api/workers/:id's risk.indicators (see backend src/heatStrain.js) --
// mirrors the web dashboard's risk-indicator-card exactly, including the
// "identifying risk patterns, not diagnosing" framing baked into every
// description string returned by the backend.
export default function RiskIndicatorCard({ title, bucket, valueText, valueUnit, description }) {
  const accent = BUCKET_COLOR[bucket] || colors.gridline;
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.tier, { backgroundColor: accent + "26" }]}>
          <Text style={[styles.tierText, { color: accent }]}>{(BUCKET_LABEL[bucket] || bucket || "—").toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.value}>
        {valueText}
        {valueUnit ? <Text style={styles.valueUnit}> {valueUnit}</Text> : null}
      </Text>
      <Text style={styles.desc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.page,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 14,
    flexBasis: "48%",
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    flexShrink: 1,
  },
  tier: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  tierText: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  valueUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  desc: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
