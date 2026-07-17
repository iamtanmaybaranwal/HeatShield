import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";
import WorkerDetailContent from "../components/WorkerDetailContent";
import { colors } from "../theme";

// Worker's root screen: no grid, no back button -- just whichever single
// device (if any) is currently allocated to their phone number. Enforced
// server-side too (GET /api/workers already filters to allocatedToUid ==
// this user), this just decides what to render from that result.
export default function WorkerHomeScreen() {
  const { profile } = useAuth();
  const [workerId, setWorkerId] = useState(undefined); // undefined = loading, null = none allocated
  const [error, setError] = useState(null);

  const check = useCallback(async () => {
    try {
      const { workers } = await apiRequest("/api/workers");
      setWorkerId(workers.length > 0 ? workers[0].workerId : null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't load your device</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (workerId === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.series1} />
      </View>
    );
  }

  if (workerId === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>No device allocated to you yet</Text>
        <Text style={styles.errorBody}>
          Ask your supervisor to allocate a device to your phone number ({profile?.phoneNumber}).
        </Text>
      </View>
    );
  }

  return <WorkerDetailContent workerId={workerId} showManagement={false} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorTitle: { fontWeight: "700", fontSize: 15, color: colors.textPrimary, marginBottom: 6, textAlign: "center" },
  errorBody: { color: colors.textMuted, fontSize: 12.5, textAlign: "center" },
});
