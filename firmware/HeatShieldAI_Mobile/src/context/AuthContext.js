// AuthContext.js
// ---------------
// App-wide auth state: Firebase init status, the signed-in Firebase user,
// and their role/profile from the backend (GET /api/auth/me). Mirrors the
// web dashboard's app.js auth flow, including the SAME race-condition fix:
// signup must wait for POST /api/auth/register to finish creating the
// Firestore profile before fetching it, or /api/auth/me 401s.

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { initFirebase, getFirebaseAuth } from "../firebaseClient";
import { apiRequest, normalizePhone, phoneToSyntheticEmail } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const suppressAuthListener = useRef(false);

  useEffect(() => {
    let unsubscribe = () => {};
    initFirebase()
      .then((auth) => {
        setFirebaseReady(true);
        unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
          if (u && !suppressAuthListener.current) {
            loadProfile();
          } else if (!u) {
            setProfile(null);
          }
        });
      })
      .catch((err) => setInitError(err.message));
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const { user: fetchedProfile } = await apiRequest("/api/auth/me");
      setProfile(fetchedProfile);
    } catch (err) {
      // A 401 here (e.g. stale/deleted account) means there's no valid
      // profile -- sign out client-side so the login screen reappears
      // instead of getting stuck on a spinner.
      if (err.status === 401) {
        await firebaseSignOut(getFirebaseAuth()).catch(() => {});
        setProfile(null);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const signUp = useCallback(async ({ phoneNumber, password, role, name, supervisorCode }) => {
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      throw new Error("Enter a valid phone number (7-15 digits).");
    }
    const email = phoneToSyntheticEmail(normalizedPhone);
    const auth = getFirebaseAuth();

    suppressAuthListener.current = true;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      try {
        await apiRequest("/api/auth/register", {
          method: "POST",
          body: { phoneNumber: normalizedPhone, role, name, supervisorCode },
        });
      } catch (registerErr) {
        await firebaseSignOut(auth).catch(() => {});
        throw registerErr;
      }
      setUser(auth.currentUser);
      await loadProfile();
    } finally {
      suppressAuthListener.current = false;
    }
  }, [loadProfile]);

  const signIn = useCallback(async ({ phoneNumber, password }) => {
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      throw new Error("Enter a valid phone number (7-15 digits).");
    }
    const email = phoneToSyntheticEmail(normalizedPhone);
    const auth = getFirebaseAuth();

    suppressAuthListener.current = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setUser(auth.currentUser);
      await loadProfile();
    } finally {
      suppressAuthListener.current = false;
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth()).catch(() => {});
    setProfile(null);
    setUser(null);
  }, []);

  const value = {
    firebaseReady,
    initError,
    user,
    profile,
    loadingProfile,
    signUp,
    signIn,
    signOut,
    reloadProfile: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
