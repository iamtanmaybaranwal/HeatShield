// lora_packet.h
// -------------
// Wire-format packet sent from the ESP32-S3 sensor node to the classic
// ESP32 gateway over LoRa (SX1278 "Ra-02", 433MHz, point-to-point).
//
// MUST stay byte-for-byte identical between this file and the gateway
// project's copy (firmware/HeatShieldAI_Gateway/src/lora_packet.h) -- if you
// add/reorder/resize a field here, make the exact same change on the other
// side, or the two ends will silently misinterpret each other's bytes.
//
// Kept to fixed-width types and __attribute__((packed)) so the in-memory
// layout is identical on both ends: the S3 (Xtensa LX7) and classic ESP32
// (Xtensa LX6) are both little-endian with IEEE-754 floats, so a raw byte
// copy across the radio link is safe without any manual serialization.

#ifndef HEATSHIELD_LORA_PACKET_H
#define HEATSHIELD_LORA_PACKET_H

#include <stdint.h>

// Sent as the first byte of every packet so the gateway can reject stray
// noise/other senders on the same frequency before trusting the rest of the
// payload.
static const uint8_t HEATSHIELD_LORA_MAGIC = 0x48;  // ASCII 'H'

// Length of the workerId field below, including the null terminator. Kept
// short since it only needs to hold ids like "worker1" -- the gateway/
// backend are the source of truth for any richer worker profile data.
static const uint8_t HEATSHIELD_WORKER_ID_LEN = 16;

struct __attribute__((packed)) HeatShieldLoRaPacket {
    uint8_t magic;             // always HEATSHIELD_LORA_MAGIC
    uint32_t sequenceNumber;   // increments every send; lets the gateway notice drops
    float temperatureC;
    float humidityPct;
    float heartRateBpm;
    float spo2Pct;
    float heatIndexC;
    uint8_t fingerPresent;     // 0 or 1 -- gateway should show "--" for HR/SpO2 when 0
    uint8_t predictedClass;    // index into HEATSHIELD_CLASS_NAMES: SAFE/WARNING/DANGER/CRITICAL
    float confidencePercent;
    // ---- GPS (NEO-6M, appended -- see gps_manager.h on the node side) ----
    float latitude;            // degrees; 0.0 if no fix has ever been acquired
    float longitude;           // degrees; 0.0 if no fix has ever been acquired
    uint8_t gpsFixValid;       // 0/1 -- gateway/backend should not plot (0,0) as a real point
    uint8_t satellites;        // satellites used in the most recent fix; 0 if none
    // ---- Worker identity, so a future multi-node gateway can tell workers
    // apart; always null-terminated (see HeatShieldLoRaPacket sender code). ----
    char workerId[HEATSHIELD_WORKER_ID_LEN];
};

#endif  // HEATSHIELD_LORA_PACKET_H
