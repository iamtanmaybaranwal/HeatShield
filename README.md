# Heatshield

An end-to-end heat-stress monitoring system for outdoor/construction workers: a wearable running an
on-device TinyML model classifies heat stress in real time (SAFE/WARNING/DANGER/CRITICAL), relays it
over LoRa to a gateway, which forwards it to a cloud backend — surfaced live on a web dashboard and a
native Android app, with a 30-day risk-pattern layer that catches cumulative strain a single reading
can't show.

This README explains how the five pieces fit together and the order to set them up in. Each piece has
its own detailed README — this is the map, not the whole territory.

## The pieces, in the order data flows through them

```
1. HeatShieldAI/                    Python: trains the on-device TinyML model
        │  (produces model.h / model_params.h)
        ▼
2. firmware/HeatShieldAI/           ESP32-S3 wearable node: sensors + GPS + TinyML inference + LoRa TX
        │  (LoRa radio)
        ▼
3. firmware/HeatShieldAI_Gateway/   Classic ESP32 gateway: LoRa RX + WiFi + HTTPS forward
        │  (HTTPS POST)
        ▼
4. firmware/HeatShieldAI_Dashboard/ Node.js backend + web dashboard (Firebase Firestore + Auth)
        │  (same REST API)
        ▼
5. firmware/HeatShieldAI_Mobile/    Expo/Android app -- same accounts, same live data
```

Only **#4 (the backend)** needs to exist for #2/#3/#5 to have anything to talk to — set that up first
if you're starting from scratch.

## 1. Train the model (optional — a trained model is already committed)

```bash
cd HeatShieldAI/training
pip install -r requirements.txt
python generate_dataset.py    # synthetic dataset, physiologically grounded (see its own README)
python train_model.py
python convert_to_tflite.py
python generate_model_header.py   # writes model.h / model_params.h into the node firmware, below
```

You only need to re-run this if you're changing the model itself. See `HeatShieldAI/README.md` for the
full pipeline (evaluation reports, quantization details, why the dataset is shaped the way it is).

## 2. Flash the wearable node

```bash
cd firmware/HeatShieldAI
pio run --target upload
pio device monitor
```

ESP32-S3 + DHT22 (temp/humidity) + MAX30102 (heart rate/SpO2) + NEO-6M GPS + SX1278 LoRa. Pin tables,
wiring, and troubleshooting are in `firmware/HeatShieldAI/README.md`.

## 3. Flash the gateway

```bash
cd firmware/HeatShieldAI_Gateway
copy src\wifi_config.h.example src\wifi_config.h    # gitignored -- your WiFi password goes here
# edit wifi_config.h: WiFi credentials + HEATSHIELD_BACKEND_URL (the backend's URL, from step 4)
pio run --target upload
pio device monitor
```

Classic ESP32 + the same SX1278 LoRa module, receiving from the node and forwarding to the backend
over WiFi. No sensors of its own — see `firmware/HeatShieldAI_Gateway/README.md` (if present) or the
comments in `src/main.cpp`.

## 4. Run the backend + web dashboard

```bash
cd firmware/HeatShieldAI_Dashboard
npm install
copy .env.example .env
# fill in .env: Firebase service account, Firebase Web config, SUPERVISOR_SIGNUP_CODE
npm start
```

This is the one everything else depends on. Full setup (Firebase project creation, Auth setup, what
each env var means) is in `firmware/HeatShieldAI_Dashboard/README.md` — follow that one first if this
is your first time setting the project up. For a real deployment (not just local testing), see that
same README's deployment notes, or ask for the Render deployment steps.

## 5. Run the mobile app

```bash
cd firmware/HeatShieldAI_Mobile
npm install
copy .env.example .env
# set EXPO_PUBLIC_API_BASE_URL to the backend's URL (from step 4)
npx expo start
```

Scan the QR code with Expo Go (must match this project's Expo SDK version) on your Android phone. Full
details, known limitations, and how to build a real installable APK (via EAS) are in
`firmware/HeatShieldAI_Mobile/README.md`.

## Accounts

Both the web dashboard and the mobile app share the same accounts (same Firebase project) — phone
number + password, either role:

- **Worker** — self-serve signup, sees only the one device a supervisor has allocated to their phone.
- **Supervisor** — signup requires the `SUPERVISOR_SIGNUP_CODE` set in the backend's `.env`; sees every
  device, and can allocate/unallocate devices to workers or erase a device's data.

## Repo layout

```
HeatShieldAI/                  TinyML training pipeline (Python) -- dataset, model, quantization
firmware/
  HeatShieldAI/                 Wearable node firmware (ESP32-S3)
  HeatShieldAI_Gateway/         LoRa-to-WiFi gateway firmware (classic ESP32)
  HeatShieldAI_Dashboard/       Backend (Node/Express + Firestore) + web dashboard
  HeatShieldAI_Mobile/          Android app (Expo)
```

## Where things are grounded

The heat-index formula, the acute SAFE/WARNING/DANGER/CRITICAL classification, and the 30-day
long-term risk indicators are all grounded in cited public-health sources (NWS/OSHA Heat Index chart,
ACGIH heat-strain criteria, NIOSH water-rest-shade guidance, published research linking repeated
occupational heat exposure to kidney injury risk) rather than arbitrary thresholds — see the comments
in `HeatShieldAI/training/generate_dataset.py` and `firmware/HeatShieldAI_Dashboard/src/heatStrain.js`
for the specifics and sources. None of this diagnoses any medical condition — it flags risk patterns
worth a closer look, the same spirit as standard occupational heat-safety guidance.
