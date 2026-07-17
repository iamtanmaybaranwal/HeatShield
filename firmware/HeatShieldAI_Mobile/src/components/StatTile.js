import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

export default function StatTile({ label, value, unit, children }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      {children ? (
        children
      ) : (
        <Text style={styles.value}>
          {value}
          {unit ? <Text style={styles.unit}> {unit}</Text> : null}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 110,
    flexGrow: 1,
  },
  label: {
    fontSize: 10.5,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  unit: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
