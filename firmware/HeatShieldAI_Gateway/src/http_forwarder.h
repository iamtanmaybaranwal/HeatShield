// http_forwarder.h
// ----------------
// HttpForwarder: serializes a received HeatShieldLoRaPacket (plus LoRa link
// quality) as JSON and POSTs it to the Node.js backend's ingest endpoint
// (see ../../HeatShieldAI_Dashboard/server.js). A failed forward (WiFi
// down, backend unreachable, timeout) never blocks or crashes the
// gateway -- the LoRa link keeps receiving regardless, and the next
// packet a few seconds later supersedes the lost one.

#ifndef HEATSHIELD_HTTP_FORWARDER_H
#define HEATSHIELD_HTTP_FORWARDER_H

#include <Arduino.h>
#include "lora_packet.h"

class HttpForwarder {
public:
    // Returns true only on a 2xx response from the backend.
    bool forward(const HeatShieldLoRaPacket& packet, int rssi, float snr);
};

#endif  // HEATSHIELD_HTTP_FORWARDER_H
