// DeviceMap.native.js
// --------------------
// Native (iOS/Android via Expo Go) implementation -- Metro picks this file
// automatically on those platforms via the .native.js extension, and picks
// DeviceMap.web.js on web. This split (not a runtime Platform.OS check)
// is required because react-native-maps imports native-only React Native
// internals that Metro's web bundler can't resolve even inside a
// conditionally-executed branch -- it statically analyzes every `require`
// reachable from the entry point regardless of runtime conditionals.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors } from "../theme";

function fmt(value, digits = 5) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export default function DeviceMap({ latest }) {
  const hasFix = !!(latest && latest.gpsFixValid);
  const region = hasFix
    ? { latitude: latest.latitude, longitude: latest.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 20, longitudeDelta: 20 }; // India centroid fallback

  return (
    <View>
      <View style={styles.mapBox}>
        <MapView style={styles.map} region={region} pointerEvents="none">
          {hasFix && <Marker coordinate={{ latitude: latest.latitude, longitude: latest.longitude }} />}
        </MapView>
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
  map: { flex: 1 },
  caption: { fontSize: 11.5, color: colors.textMuted, marginTop: 8 },
});
