import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

const TONE_STYLE = {
  good: { bg: colors.statusGood + "14", accent: colors.statusGood, icon: "checkmark-circle" },
  warning: { bg: colors.statusWarning + "1a", accent: "#a8630a", icon: "alert-circle" },
  critical: { bg: colors.statusCritical + "14", accent: colors.statusCritical, icon: "warning" },
};

// The ONE card that replaces the old 4-card technical risk grid + "why
// this matters" wall of text: a single plain-language verdict, with the
// specifics available if you want them but not shoved in your face.
export default function HealthSummaryCard({ summary }) {
  const [expanded, setExpanded] = useState(false);
  const style = TONE_STYLE[summary.tone];

  return (
    <View style={[styles.card, { backgroundColor: style.bg, borderColor: style.accent + "40" }]}>
      <View style={styles.headerRow}>
        <Ionicons name={style.icon} size={26} color={style.accent} />
        <Text style={[styles.headline, { color: style.accent }]}>{summary.headline}</Text>
      </View>
      <Text style={styles.body}>{summary.body}</Text>

      {summary.details.length > 0 && (
        <>
          <TouchableOpacity style={styles.toggle} onPress={() => setExpanded((v) => !v)}>
            <Text style={styles.toggleText}>{expanded ? "Hide details" : "What we looked at"}</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.series1} />
          </TouchableOpacity>
          {expanded && (
            <View style={styles.detailsBox}>
              {summary.details.map((d) => (
                <View key={d.label} style={styles.detailRow}>
                  <View style={styles.detailDot} />
                  <Text style={styles.detailText}>{d.statLine}</Text>
                </View>
              ))}
              <Text style={styles.disclaimer}>Based on your last 30 days of sensor readings.</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  headline: { fontSize: 17, fontWeight: "800", flexShrink: 1 },
  body: { fontSize: 13.5, lineHeight: 20, color: colors.textPrimary },
  toggle: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  toggleText: { fontSize: 12.5, fontWeight: "700", color: colors.series1 },
  detailsBox: { marginTop: 10, gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted, marginTop: 6 },
  detailText: { fontSize: 12, color: colors.textSecondary, flexShrink: 1, lineHeight: 17 },
  disclaimer: { fontSize: 10.5, color: colors.textMuted, fontStyle: "italic", marginTop: 6 },
});
