// config.js
// ---------
// The one thing this app needs configured per-network: where the
// HeatShieldAI Dashboard backend (../../HeatShieldAI_Dashboard) is
// reachable. Everything else (Firebase Web config, supervisor signup code,
// etc.) is fetched FROM that backend at runtime -- see src/firebaseClient.js
// -- so there's only ever one place to configure credentials, same as the
// web dashboard.
//
// Set via EXPO_PUBLIC_API_BASE_URL in .env (Expo inlines EXPO_PUBLIC_*
// vars into the JS bundle automatically, no extra config needed). Your
// phone (running Expo Go) and the computer running the backend must be on
// the same WiFi network -- find that computer's LAN IP with `ipconfig`
// (Windows) / `ifconfig` (macOS/Linux), same as the gateway's setup.

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.100:3000";

if (__DEV__ && API_BASE_URL.includes("192.168.1.100")) {
  console.warn(
    "[config] EXPO_PUBLIC_API_BASE_URL is not set in .env -- using the placeholder " +
      API_BASE_URL +
      ". Copy .env.example to .env and set it to your backend's real LAN IP."
  );
}
