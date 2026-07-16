// wifi_manager.h
// --------------
// WiFiManager: brings the gateway's WiFi station connection up and keeps it
// up, without ever blocking the LoRa receive loop. A dropped/never-acquired
// WiFi connection just means readings queue up on the node's next LoRa
// packet a few seconds later instead of forwarding to the backend -- it is
// never fatal to the gateway itself (LoRa reception keeps working
// regardless of WiFi state).

#ifndef HEATSHIELD_WIFI_MANAGER_H
#define HEATSHIELD_WIFI_MANAGER_H

#include <Arduino.h>

class WiFiManager {
public:
    // Starts a WiFi station connection attempt (non-blocking -- returns
    // immediately, connection happens in the background).
    void begin();

    // Call every loop() iteration. Cheap (a single status check) when
    // already connected; rate-limited reconnect attempts when not, so it
    // never hammers WiFi.begin() in a tight loop.
    void ensureConnected();

    bool isConnected() const;

private:
    unsigned long lastReconnectAttemptMs_ = 0;
};

#endif  // HEATSHIELD_WIFI_MANAGER_H
