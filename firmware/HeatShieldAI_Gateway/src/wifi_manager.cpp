// wifi_manager.cpp
// See wifi_manager.h for the contract this file implements.

#include "wifi_manager.h"
#include <WiFi.h>
#include "wifi_config.h"

namespace {
constexpr unsigned long kReconnectIntervalMs = 10000;
}

void WiFiManager::begin() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    Serial.print(F("[WiFi] Connecting to \""));
    Serial.print(HEATSHIELD_WIFI_SSID);
    Serial.println(F("\"..."));
    WiFi.begin(HEATSHIELD_WIFI_SSID, HEATSHIELD_WIFI_PASSWORD);
    lastReconnectAttemptMs_ = millis();
}

bool WiFiManager::isConnected() const {
    return WiFi.status() == WL_CONNECTED;
}

void WiFiManager::ensureConnected() {
    if (isConnected()) {
        return;
    }
    unsigned long now = millis();
    if (now - lastReconnectAttemptMs_ < kReconnectIntervalMs) {
        return;
    }
    lastReconnectAttemptMs_ = now;
    Serial.println(F("[WiFi] Not connected -- retrying (check wifi_config.h / router range)..."));
    WiFi.disconnect();
    WiFi.begin(HEATSHIELD_WIFI_SSID, HEATSHIELD_WIFI_PASSWORD);
}
