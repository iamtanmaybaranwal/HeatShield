import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../api";
import { colors } from "../theme";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [role, setRole] = useState("worker");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [supervisorCode, setSupervisorCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const isSupervisor = role === "supervisor";

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp({ phoneNumber, password, role, name, supervisorCode });
      } else {
        await signIn({ phoneNumber, password });
      }
    } catch (err) {
      setError(friendlyAuthError(err));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  return (
    <LinearGradient colors={[colors.navyDark, colors.navy]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <Image source={require("../../assets/logo.png")} style={styles.logo} />
            <Text style={styles.brandTitle}>Heatshield</Text>
            <Text style={styles.brandSubtitle}>Worker Heat-Stress Monitoring</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{isSignup ? "Create an account" : "Welcome back"}</Text>
            <Text style={styles.subtitle}>{isSignup ? "Sign up" : "Sign in"} to continue</Text>

            <View style={styles.roleTabs}>
              <TouchableOpacity
                style={[styles.roleTab, role === "worker" && styles.roleTabActive]}
                onPress={() => setRole("worker")}
              >
                <Text style={[styles.roleTabText, role === "worker" && styles.roleTabTextActive]}>
                  Worker
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleTab, role === "supervisor" && styles.roleTabActive]}
                onPress={() => setRole("supervisor")}
              >
                <Text style={[styles.roleTabText, role === "supervisor" && styles.roleTabTextActive]}>
                  Supervisor
                </Text>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoCapitalize="none"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            {isSignup && (
              <View style={styles.field}>
                <Text style={styles.label}>Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder={isSignup ? "At least 6 characters" : "Password"}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {isSignup && isSupervisor && (
              <View style={styles.field}>
                <Text style={styles.label}>Supervisor signup code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ask your admin for this"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  value={supervisorCode}
                  onChangeText={setSupervisorCode}
                />
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isSignup ? "Sign up" : "Sign in"} as {isSupervisor ? "supervisor" : "worker"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => {
                setError(null);
                setMode(isSignup ? "signin" : "signup");
              }}
            >
              <Text style={styles.switchModeText}>
                {isSignup ? "Already have an account? " : "Don't have an account? "}
                <Text style={styles.switchModeLink}>{isSignup ? "Sign in" : "Sign up"}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24, paddingTop: 56, paddingBottom: 40 },
  brandRow: { alignItems: "center", marginBottom: 26 },
  logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 12 },
  brandTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  brandSubtitle: { fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 3 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  title: { fontSize: 19, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 18 },
  roleTabs: {
    flexDirection: "row",
    backgroundColor: colors.gridline,
    borderRadius: 999,
    padding: 3,
    marginBottom: 18,
  },
  roleTab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: "center" },
  roleTabActive: { backgroundColor: colors.surface, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  roleTabText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  roleTabTextActive: { color: colors.navy },
  errorBox: {
    backgroundColor: colors.statusCritical + "20",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: colors.statusCritical, fontSize: 12.5 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.page,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.accentOrange,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
    shadowColor: colors.accentOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  switchMode: { marginTop: 18, alignItems: "center" },
  switchModeText: { fontSize: 12.5, color: colors.textMuted },
  switchModeLink: { color: colors.navy, fontWeight: "700" },
});
