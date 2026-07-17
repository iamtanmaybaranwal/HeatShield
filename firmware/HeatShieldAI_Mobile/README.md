# Heatshield Mobile

An Expo (SDK 54) Android preview of the [Heatshield Dashboard](../HeatShieldAI_Dashboard) — same
backend, same Firebase Auth accounts, same worker data. Sign in as a worker or supervisor exactly like
the web app; a supervisor sees every device and can allocate/unallocate/erase, a worker sees only
their one allocated device.

This app talks to the **same Express backend** as the web dashboard (`../HeatShieldAI_Dashboard`) —
it doesn't have its own server or its own copy of the data. Whatever's showing on the web dashboard is
exactly what shows here, live (both poll the same API every 5 seconds).

## Requirements

- The `HeatShieldAI_Dashboard` backend already set up and running (`npm start` in that folder) — see its
  own README if you haven't done that yet. This app is useless without it; it has no data of its own.
- [Expo Go](https://expo.dev/go) installed on your Android phone, matching **SDK 54** (this project is
  pinned to `expo ~54.0.0` specifically for that reason).
- Your phone and the computer running the backend on the **same WiFi network**.

## Setup

```bash
cd firmware/HeatShieldAI_Mobile
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
```

Open `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the backend computer's LAN IP (find it with
`ipconfig` on Windows / `ifconfig` on macOS/Linux — the same address you'd have used for the
gateway's `wifi_config.h` or the web dashboard setup), e.g.:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3000
```

Nothing else needs configuring here — Firebase Web config is fetched from the backend's own
`GET /api/firebase-config` at startup, exactly like the web dashboard, so there's still only one place
(the backend's `.env`) where Firebase credentials actually live.

## Run it

```bash
npx expo start
```

A QR code appears in the terminal. Open **Expo Go** on your Android phone and scan it. The app loads
over your WiFi network (no cable, no build step, no Play Store).

If Expo Go can't connect: confirm your phone and computer are on the same WiFi network, and that
nothing (like a firewall) is blocking the connection — `npx expo start --tunnel` routes through Expo's
relay instead of your LAN if direct connection isn't working, at the cost of being slower.

## What's implemented

Full parity with the web dashboard, plus mobile-native navigation:

- Phone + password sign-in/signup, Worker/Supervisor role tabs, supervisor signup code gate — same
  accounts work in both apps interchangeably (it's the same Firebase project).
- **Bottom tab bar** (both roles): **Home** — supervisor's worker grid / worker's single device — and
  **Settings** — profile (name, phone, role) with an **Edit name** flow (`PATCH /api/auth/me`; phone
  number isn't editable since it's the sign-in identifier), plus Sign out.
- Supervisor: worker grid, tap into any device for full detail (native back button/gesture via the
  stack navigator, tab bar stays visible), device management (allocate to a registered worker's phone
  number / unallocate / erase all data with a confirm prompt).
- Worker: Home tab lands directly on their one allocated device, or a "no device allocated yet" screen
  showing their phone number for a supervisor to allocate against.
- Per-device detail: live stat tiles, GPS location, the same **four long-term heat-exposure risk
  indicators** (heat strain / cardiovascular strain / electrolyte risk / dehydration trend) with the
  same "Why this matters" explanation, a 30-day trend chart (switchable metric), and recent readings.
- Live polling every 5s, same as the web app.
- Branded login screen (gradient background, logo, shadowed card) and app icon/header using
  `assets/logo.png` — see "Branding" below.

## Branding

The logo lives at `assets/logo.png` and is used in three places: the login screen, the header (next to
the screen title), and the Settings screen's profile avatar — swap that one file for a different image
(same filename, no code changes needed) to rebrand.

It's also wired up in `app.json` as the actual **app icon** (`icon`, `android.adaptiveIcon.foregroundImage`)
and web favicon. One thing worth understanding: **while testing via `npx expo start` + Expo Go, the
Android app drawer always shows Expo Go's own icon**, not `logo.png` — your app is running *inside* the
Expo Go container at that point, not installed as its own app. `app.json`'s icon config only takes
effect on a real standalone build (`eas build`, or `npx expo prebuild` + a native build) that installs
as its own app — that's when the launcher icon will actually be `logo.png`.

## Known limitations (read before assuming something's broken)

- **No SMS OTP** — same as the web app, phone number + password only for now, not actually SMS-verified.
- **No dark mode** — the web dashboard's light/dark toggle isn't reproduced here; this app is light-theme
  only, to keep this preview focused on feature parity first.
- **Map only works on your actual phone.** `react-native-maps` is a native module with no web support —
  it renders a real interactive map in Expo Go on Android, but if you ever run `npx expo start --web`
  to preview in a browser (useful for quick UI checks without a phone), that one panel shows a text
  fallback with the coordinates instead of a map. This is intentional (see
  `src/components/DeviceMap.web.js`), not a bug — the native app on your phone always shows the real map.
- **iOS is untested.** This was built and verified for Android/Expo Go specifically, per the request
  that started this. It's plain React Native underneath, so iOS likely works too via Expo Go, but hasn't
  been checked.
- **No push notifications.** Alerts (buzzer/vibration for WARNING+) only happen on the physical wearable
  itself — this app is a viewer, not an alerting channel.

## Project layout

```
App.js                          Bottom-tab + stack navigation root, auth-gated routing
assets/logo.png                 The one file to swap to rebrand -- see "Branding" above
src/config.js                   EXPO_PUBLIC_API_BASE_URL
src/firebaseClient.js           Firebase Auth init (React Native/AsyncStorage persistence)
src/api.js                      apiRequest() (Bearer-token-authenticated fetch) + phone<->email helpers
src/theme.js                    Web dashboard's validated color tokens + brand navy/orange
src/context/AuthContext.js      Auth state, sign in/up/out (same race-condition fix as the web app)
src/screens/LoginScreen.js      Role tabs + phone/password form (gradient background, logo)
src/screens/WorkerGridScreen.js Supervisor's worker list (Home tab)
src/screens/WorkerDetailScreen.js   Supervisor's drill-down (native back button via the stack navigator)
src/screens/WorkerHomeScreen.js Worker's single-device root (Home tab, no back button)
src/screens/SettingsScreen.js   Profile view/edit (Settings tab, both roles)
src/components/WorkerDetailContent.js  Shared detail body (stat tiles, map, risk panel, chart, readings,
                                        management panel) used by both detail screens above
src/components/DeviceMap.native.js / .web.js   Platform-split map (see "Known limitations")
src/components/*.js             StatusBadge, StatTile, RiskIndicatorCard, ReadingRow, TrendChart
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Couldn't start the app" / Firebase config error on launch | The backend isn't running, or `EXPO_PUBLIC_API_BASE_URL` in `.env` is wrong/unreachable from your phone. |
| Expo Go says the app needs a different SDK version | Your Expo Go app isn't on SDK 54. Update Expo Go from the Play Store, or ask about pinning this project to whatever SDK your Expo Go actually is. |
| Login works but the grid never loads | Same network-reachability check as above — the login screen only needs Firebase (may work over mobile data), but every other screen needs the backend specifically. |
| Changed `.env` but nothing changed | Env vars are inlined at bundle time — stop and restart `npx expo start` (a hot reload isn't enough). |
| Password field still covered by the keyboard | Should be fixed (`android.softwareKeyboardLayoutMode: "resize"` in `app.json` + `KeyboardAvoidingView` on the login screen) — if you still see it on a specific device/Android version, let me know which one. |
| App drawer shows Expo Go's icon, not the logo | Expected while testing via Expo Go — see "Branding" above, this only changes on a real standalone build. |
