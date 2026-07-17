import React from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import WorkerGridScreen from "./src/screens/WorkerGridScreen";
import WorkerDetailScreen from "./src/screens/WorkerDetailScreen";
import WorkerHomeScreen from "./src/screens/WorkerHomeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HeaderTitle({ children }) {
  return (
    <View style={styles.headerTitleRow}>
      <Image source={require("./assets/logo.png")} style={styles.headerLogo} />
      <Text style={styles.headerTitleText}>{children}</Text>
    </View>
  );
}

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTitleStyle: { color: colors.textPrimary, fontSize: 16 },
};

function SupervisorHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="WorkerGrid"
        component={WorkerGridScreen}
        options={{ headerTitle: () => <HeaderTitle>Heatshield</HeaderTitle> }}
      />
      <Stack.Screen name="WorkerDetail" component={WorkerDetailScreen} options={{ title: "Device" }} />
    </Stack.Navigator>
  );
}

function WorkerHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="WorkerHome"
        component={WorkerHomeScreen}
        options={{ headerTitle: () => <HeaderTitle>Heatshield</HeaderTitle> }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Profile & Settings" }} />
    </Stack.Navigator>
  );
}

function tabIcon(routeName) {
  return ({ focused, color, size }) => {
    const name =
      routeName === "Home" ? (focused ? "home" : "home-outline") : focused ? "person-circle" : "person-circle-outline";
    return <Ionicons name={name} size={size} color={color} />;
  };
}

function MainTabs({ homeStack: HomeStack }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: tabIcon(route.name),
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { firebaseReady, initError, user, profile, loadingProfile } = useAuth();

  if (initError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't start the app</Text>
        <Text style={styles.errorBody}>{initError}</Text>
        <Text style={styles.errorHint}>
          Check EXPO_PUBLIC_API_BASE_URL in .env points at a reachable backend, and that its Firebase Web
          config is set. See README.md.
        </Text>
      </SafeAreaView>
    );
  }

  if (!firebaseReady || (user && !profile && loadingProfile)) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} size="large" />
      </SafeAreaView>
    );
  }

  if (!user || !profile) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      {profile.role === "supervisor" ? (
        <MainTabs homeStack={SupervisorHomeStack} />
      ) : (
        <MainTabs homeStack={WorkerHomeStack} />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.page, padding: 24 },
  errorTitle: { fontWeight: "700", fontSize: 16, color: colors.textPrimary, marginBottom: 8, textAlign: "center" },
  errorBody: { color: colors.statusCritical, fontSize: 13, textAlign: "center", marginBottom: 8 },
  errorHint: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { width: 30, height: 30, borderRadius: 8 },
  headerTitleText: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
});
