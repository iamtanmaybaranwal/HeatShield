import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { statusMeta, colors } from "../theme";

export default function StatusBadge({ predictedClass, size = "md" }) {
  const meta = statusMeta(predictedClass);
  const isLg = size === "lg";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: meta.color + "26" },
        isLg && styles.badgeLg,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color }, isLg && styles.labelLg]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 6,
  },
  badgeLg: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  labelLg: {
    fontSize: 14,
  },
});
