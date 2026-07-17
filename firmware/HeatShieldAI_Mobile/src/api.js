// api.js
// ------
// Talks to the SAME HeatShieldAI Dashboard backend the web app uses --
// same endpoints, same auth model (Firebase ID token as a Bearer header),
// so a worker/supervisor's data is identical across both. Never talks to
// Firestore directly.

import { getFirebaseAuth } from "./firebaseClient";
import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const user = getFirebaseAuth().currentUser;
  const headers = { "Content-Type": "application/json" };
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || `Request to ${path} failed (${res.status})`, res.status);
  }
  return data;
}

// ---- Phone <-> synthetic email (mirrors backend's src/auth.js exactly) ----

const SYNTHETIC_EMAIL_DOMAIN = "heatshieldai.local";

export function normalizePhone(rawPhone) {
  if (typeof rawPhone !== "string") return null;
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return (hasPlus ? "+" : "") + digits;
}

export function phoneToSyntheticEmail(normalizedPhone) {
  const digitsOnly = normalizedPhone.replace(/\D/g, "");
  return `${digitsOnly}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function friendlyAuthError(err) {
  const code = err && err.code;
  const map = {
    "auth/email-already-in-use": "That phone number is already registered -- try signing in instead.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect phone number or password.",
    "auth/user-not-found": "No account with that phone number -- try signing up instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Can't reach Firebase -- check your internet connection.",
  };
  return map[code] || (err && err.message) || "Something went wrong. Please try again.";
}
