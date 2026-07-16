// http_forwarder.cpp
// See http_forwarder.h for the contract this file implements.

#include "http_forwarder.h"

#include <string.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "wifi_config.h"

namespace {
constexpr uint32_t kHttpTimeoutMs = 5000;
}

bool HttpForwarder::forward(const HeatShieldLoRaPacket& packet, int rssi, float snr) {
    if (WiFi.status() != WL_CONNECTED) {
        return false;
    }

    // Copy workerId into a bounded, guaranteed-null-terminated buffer
    // before treating it as a C string -- defense against a corrupted
    // packet that somehow passed the magic-byte check but has a
    // non-terminated workerId.
    char workerId[HEATSHIELD_WORKER_ID_LEN + 1];
    memcpy(workerId, packet.workerId, HEATSHIELD_WORKER_ID_LEN);
    workerId[HEATSHIELD_WORKER_ID_LEN] = '\0';

    JsonDocument doc;
    doc["workerId"] = workerId;
    doc["sequenceNumber"] = packet.sequenceNumber;
    doc["temperatureC"] = packet.temperatureC;
    doc["humidityPct"] = packet.humidityPct;
    doc["heartRateBpm"] = packet.heartRateBpm;
    doc["spo2Pct"] = packet.spo2Pct;
    doc["heatIndexC"] = packet.heatIndexC;
    doc["fingerPresent"] = packet.fingerPresent != 0;
    doc["predictedClass"] = packet.predictedClass;
    doc["confidencePercent"] = packet.confidencePercent;
    doc["latitude"] = packet.latitude;
    doc["longitude"] = packet.longitude;
    doc["gpsFixValid"] = packet.gpsFixValid != 0;
    doc["satellites"] = packet.satellites;
    doc["rssi"] = rssi;
    doc["snr"] = snr;

    String payload;
    serializeJson(doc, payload);

    HTTPClient http;
    http.setTimeout(kHttpTimeoutMs);
    if (!http.begin(HEATSHIELD_BACKEND_URL)) {
        Serial.println(F("[HTTP] begin() failed -- check HEATSHIELD_BACKEND_URL in wifi_config.h."));
        return false;
    }
    http.addHeader("Content-Type", "application/json");
    if (strlen(HEATSHIELD_INGEST_API_KEY) > 0) {
        http.addHeader("x-api-key", HEATSHIELD_INGEST_API_KEY);
    }

    int statusCode = http.POST(payload);

    bool ok = statusCode >= 200 && statusCode < 300;
    if (statusCode <= 0) {
        Serial.print(F("[HTTP] Request failed: "));
        Serial.println(HTTPClient::errorToString(statusCode));
    } else if (!ok) {
        Serial.print(F("[HTTP] Backend returned status ")); Serial.println(statusCode);
    }

    http.end();
    return ok;
}
