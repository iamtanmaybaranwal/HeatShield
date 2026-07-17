// firebaseClient.js
// -------------------
// Initializes Firebase Auth for React Native (AsyncStorage-backed session
// persistence, since RN has no browser localStorage). Mirrors
// HeatShieldAI_Dashboard/public/app.js's initApp(): the actual Firebase Web
// config (apiKey/authDomain/projectId/appId) is fetched from the backend's
// GET /api/firebase-config at startup rather than hardcoded here, so
// there's exactly one place (.env on the backend) to configure Firebase
// credentials for both the web dashboard and this app.
//
// NOTE ON THE IMPORT BELOW: getReactNativePersistence lives in
// "firebase/auth"'s React-Native build (@firebase/auth's package.json
// "react-native" export condition, resolved automatically by Metro) --
// verified against the actually-installed firebase@12 package rather than
// assumed, since this exact API has moved around between firebase major
// versions in the past.

import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth, connectAuthEmulator } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

let authInstance = null;
let initPromise = null;

async function fetchFirebaseConfig() {
  const res = await fetch(`${API_BASE_URL}/api/firebase-config`);
  if (!res.ok) {
    throw new Error(`Could not load Firebase config from backend (${res.status}).`);
  }
  const config = await res.json();
  if (!config.apiKey) {
    throw new Error(
      "Backend has no Firebase Web config set (FIREBASE_WEB_API_KEY etc. in its .env) -- see README.md."
    );
  }
  return config;
}

// Call once at app startup (see App.js). Returns the initialized auth
// instance; safe to call multiple times (subsequent calls reuse the same
// in-flight/resolved promise instead of re-initializing).
export function initFirebase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const config = await fetchFirebaseConfig();
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (err) {
      // initializeAuth throws if already called once for this app (e.g. Fast
      // Refresh during development re-running this module) -- fall back to
      // the existing instance instead of crashing.
      authInstance = getAuth(app);
    }

    // Opt-in only (EXPO_PUBLIC_USE_AUTH_EMULATOR=1 in .env): points at a
    // local Firebase Auth emulator instead of real Firebase, mirroring the
    // web dashboard's own `?emulator=1` testing hook. Never triggers
    // otherwise.
    if (process.env.EXPO_PUBLIC_USE_AUTH_EMULATOR === "1") {
      const host = process.env.EXPO_PUBLIC_AUTH_EMULATOR_HOST || "localhost:9099";
      connectAuthEmulator(authInstance, `http://${host}`, { disableWarnings: true });
    }

    return authInstance;
  })();

  return initPromise;
}

export function getFirebaseAuth() {
  if (!authInstance) {
    throw new Error("initFirebase() must resolve before getFirebaseAuth() is called.");
  }
  return authInstance;
}
