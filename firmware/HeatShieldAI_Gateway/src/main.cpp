// main.cpp
// ---------
// HeatShieldAI Gateway firmware entry point. Receives HeatShieldLoRaPacket
// telemetry from the ESP32-S3 sensor node (../HeatShieldAI) over an SX1278
// "Ra-02" 433MHz LoRa module and prints it to Serial. No sensors, display,
// or TinyML model live on this board -- it's purely a LoRa-to-Serial bridge.

#include <Arduino.h>

#include "lora_manager.h"
#include "lora_packet.h"
#include "wifi_manager.h"
#include "http_forwarder.h"

// Mirrors HEATSHIELD_CLASS_NAMES in ../HeatShieldAI/src/model_params.h --
// the node sends predictedClass as an index into this same ordering, since
// the gateway doesn't run the model itself.
static const char* const kClassNames[4] = {"SAFE", "WARNING", "DANGER", "CRITICAL"};

static LoRaGatewayManager loraManager;
static WiFiManager wifiManager;
static HttpForwarder httpForwarder;

// If no packet has arrived in this long, print a link-lost notice (once,
// not on every loop iteration) so it's obvious on Serial that the node has
// gone quiet rather than the gateway just having nothing new to show.
static const unsigned long kLinkLostTimeoutMs = 15000;
static unsigned long lastReceivedMs = 0;
static bool everReceived = false;
static bool linkLostNoticePrinted = false;

void setup() {
    Serial.begin(115200);
    delay(300);  // let USB-serial settle on some ESP32 boards

    Serial.println(F("=========================================="));
    Serial.println(F(" HeatShield AI - LoRa Gateway Firmware"));
    Serial.println(F("=========================================="));

    if (!loraManager.begin()) {
        Serial.println(F("[FATAL] SX1278 LoRa module not detected on SPI bus. "
                          "Check wiring -- will keep retrying in loop()."));
    } else {
        Serial.println(F("[OK] LoRa radio ready. Waiting for node telemetry..."));
    }

    // ---- WiFi + backend forwarding (never fatal if missing/unreachable;
    // LoRa reception keeps working regardless -- see wifi_manager.h) ----
    wifiManager.begin();
}

void loop() {
    // Non-blocking: returns immediately if already connected, otherwise
    // kicks off a rate-limited reconnect attempt. Runs every iteration
    // regardless of LoRa state so WiFi keeps trying to recover in the
    // background even while waiting on the radio.
    wifiManager.ensureConnected();

    // ---- Recover from a failed radio init without ever hard-crashing ----
    if (!loraManager.isReady()) {
        delay(2000);
        if (loraManager.begin()) {
            Serial.println(F("[OK] LoRa radio initialized on retry."));
        }
        return;
    }

    HeatShieldLoRaPacket packet;
    int rssi = 0;
    float snr = 0.0f;
    LoRaReceiveResult result = loraManager.tryReceive(packet, rssi, snr);

    switch (result) {
        case LoRaReceiveResult::kNone:
            break;

        case LoRaReceiveResult::kInvalidSize:
            Serial.println(F("[WARN] Received a LoRa packet with an unexpected size "
                              "(noise, collision, or a different sender on this frequency)."));
            break;

        case LoRaReceiveResult::kBadMagic:
            Serial.println(F("[WARN] Received a right-sized LoRa packet that failed the "
                              "magic-byte check (corruption or a different sender)."));
            break;

        case LoRaReceiveResult::kValid: {
            lastReceivedMs = millis();
            everReceived = true;
            linkLostNoticePrinted = false;

            const char* className = (packet.predictedClass < 4)
                ? kClassNames[packet.predictedClass]
                : "UNKNOWN";

            Serial.println(F("-----------------------------------------------"));
            Serial.print(F("[LoRa] Packet #")); Serial.print(packet.sequenceNumber);
            Serial.print(F(" | RSSI: ")); Serial.print(rssi); Serial.print(F(" dBm"));
            Serial.print(F(" | SNR: ")); Serial.print(snr, 1); Serial.println(F(" dB"));

            Serial.print(F("Temperature       : ")); Serial.print(packet.temperatureC, 2); Serial.println(F(" C"));
            Serial.print(F("Humidity          : ")); Serial.print(packet.humidityPct, 2); Serial.println(F(" %"));
            if (packet.fingerPresent) {
                Serial.print(F("Heart Rate        : ")); Serial.print(packet.heartRateBpm, 1); Serial.println(F(" BPM"));
                Serial.print(F("SpO2              : ")); Serial.print(packet.spo2Pct, 1); Serial.println(F(" %"));
            } else {
                Serial.println(F("Heart Rate        : -- (no finger on node's sensor)"));
                Serial.println(F("SpO2              : -- (no finger on node's sensor)"));
            }
            Serial.print(F("Heat Index        : ")); Serial.print(packet.heatIndexC, 2); Serial.println(F(" C"));
            Serial.print(F("Prediction        : ")); Serial.println(className);
            Serial.print(F("Confidence        : ")); Serial.print(packet.confidencePercent, 1); Serial.println(F(" %"));
            if (packet.gpsFixValid) {
                Serial.print(F("GPS               : ")); Serial.print(packet.latitude, 6);
                Serial.print(F(", ")); Serial.print(packet.longitude, 6);
                Serial.print(F(" (")); Serial.print(packet.satellites); Serial.println(F(" sats)"));
            } else {
                Serial.println(F("GPS               : -- (node has no fix yet)"));
            }

            // ---- Forward to the Node.js backend over WiFi (never blocks
            // LoRa reception on failure -- see http_forwarder.h) ----
            if (wifiManager.isConnected()) {
                bool forwarded = httpForwarder.forward(packet, rssi, snr);
                Serial.println(forwarded
                    ? F("[HTTP] Forwarded to backend.")
                    : F("[HTTP] Forward FAILED (backend unreachable/error) -- reading dropped, next one supersedes it."));
            } else {
                Serial.println(F("[HTTP] Skipped forward -- WiFi not connected."));
            }
            break;
        }
    }

    if (everReceived && !linkLostNoticePrinted &&
        (millis() - lastReceivedMs) > kLinkLostTimeoutMs) {
        Serial.print(F("[WARN] No telemetry received from node in over "));
        Serial.print(kLinkLostTimeoutMs / 1000);
        Serial.println(F("s. Check the node is powered and in range."));
        linkLostNoticePrinted = true;
    }

    delay(10);  // cooperative yield; LoRa.parsePacket() is a cheap non-blocking poll
}
