import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api";
import { colors } from "../theme";

export default function SettingsScreen() {
  const { profile, signOut, reloadProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiRequest("/api/auth/me", { method: "PATCH", body: { name: name.trim() } });
      await reloadProfile();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.profileHeader}>
        <Image source={require("../../assets/logo.png")} style={styles.avatar} />
        <Text style={styles.profileName}>{profile?.name || "No name set"}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{profile?.role}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          ) : (
            <Text style={styles.value}>{profile?.name || "—"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone number</Text>
          <Text style={styles.value}>{profile?.phoneNumber}</Text>
          <Text style={styles.hint}>Phone number can't be changed here — it's your sign-in identifier.</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{profile?.role === "supervisor" ? "Supervisor" : "Worker"}</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {saved && <Text style={styles.savedText}>Saved.</Text>}

        {editing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setEditing(false);
                setName(profile?.name || "");
                setError(null);
              }}
              disabled={saving}
            >
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setEditing(true)}>
            <Text style={styles.btnPrimaryText}>Edit name</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  profileHeader: { alignItems: "center", paddingVertical: 16, gap: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  profileName: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  rolePill: { backgroundColor: colors.gridline, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  rolePillText: { fontSize: 10.5, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 18,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 14 },
  field: { marginBottom: 16 },
  label: { fontSize: 11.5, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", marginBottom: 5 },
  value: { fontSize: 15, color: colors.textPrimary, fontWeight: "600" },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.page,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  errorText: { color: colors.statusCritical, fontSize: 12.5, marginBottom: 10 },
  savedText: { color: colors.statusGood, fontSize: 12.5, marginBottom: 10 },
  buttonRow: { flexDirection: "row", gap: 10 },
  btnPrimary: { backgroundColor: colors.navy, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 20, alignItems: "center", flexGrow: 1 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  btnSecondary: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 20, alignItems: "center" },
  btnSecondaryText: { color: colors.textPrimary, fontWeight: "600", fontSize: 13.5 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: colors.statusCritical,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  signOutText: { color: colors.statusCritical, fontWeight: "700", fontSize: 14 },
});
