// DeviceMap.web.js
// -----------------
// Web-preview fallback -- react-native-maps has no web support (native-only
// module). Metro picks this file automatically when bundling for web (see
// DeviceMap.native.js for why this is a file-extension split rather than a
// runtime Platform.OS check). The actual Android/iOS app in Expo Go always
// uses DeviceMap.native.js's real map; this file exists purely so
// `expo start --web` is usable for quick preview/testing without a device.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

function fmt(value, digits = 5) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export default function DeviceMap({ latest }) {
  const hasFix = !!(latest && latest.gpsFixValid);
  return (
    <View>
      <View style={[styles.mapBox, styles.webFallback]}>
        <Text style={styles.webFallbackText}>
          {hasFix
            ? `Map preview unavailable on web -- ${fmt(latest.latitude)}, ${fmt(latest.longitude)}`
            : "Map preview unavailable on web (native app shows a live map here)"}
        </Text>
      </View>
      <Text style={styles.caption}>
        {hasFix
          ? `${fmt(latest.latitude)}, ${fmt(latest.longitude)} · ${latest.satellites} satellites`
          : "No GPS fix yet"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { height: 200, borderRadius: 8, overflow: "hidden", backgroundColor: colors.gridline },
  webFallback: { alignItems: "center", justifyContent: "center", padding: 16 },
  webFallbackText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  caption: { fontSize: 11.5, color: colors.textMuted, marginTop: 8 },
});
