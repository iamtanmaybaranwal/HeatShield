import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { TONE_COLOR } from "../lib/vitalDescriptors";

// One vital, read out as a single natural sentence ("Your heart rate is 87
// BPM — normal.") rather than a label + bare number + one-word tag -- the
// number and the plain-language read are one sentence, not three separate
// pieces of UI.
export default function VitalCard({ icon, descriptor }) {
  const tone = descriptor?.tone || "muted";
  const toneColor = TONE_COLOR[tone];
  const sentence = descriptor?.sentence || "Waiting for a reading…";

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: toneColor + "1f" }]}>
        <Ionicons name={icon} size={18} color={toneColor} />
      </View>
      <Text style={styles.sentence}>{sentence}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sentence: { flex: 1, fontSize: 13.5, fontWeight: "500", color: colors.textPrimary, lineHeight: 19 },
});
