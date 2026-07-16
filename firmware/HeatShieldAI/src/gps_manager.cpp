// gps_manager.cpp
// See gps_manager.h for the contract this file implements.

#include "gps_manager.h"

void GpsManager::begin() {
    // Bigger-than-default RX buffer: the NEO-6M streams NMEA sentences
    // continuously (~300-400 bytes/sec at its default 1Hz update rate), but
    // this firmware only drains the UART between blocking sensor reads (the
    // MAX30102 pulse window alone blocks for ~4s). The default 256-byte
    // ring buffer would overflow and drop bytes mid-sentence during that
    // window; must be set before begin().
    Serial1.setRxBufferSize(1024);
    Serial1.begin(HEATSHIELD_GPS_BAUD, SERIAL_8N1, HEATSHIELD_GPS_RX_PIN, HEATSHIELD_GPS_TX_PIN);
}

void GpsManager::update() {
    while (Serial1.available() > 0) {
        gps_.encode(Serial1.read());
    }

    bool freshFix = gps_.location.isValid() &&
                     gps_.location.age() < HEATSHIELD_GPS_MAX_FIX_AGE_MS;
    if (freshFix) {
        latitude_ = static_cast<float>(gps_.location.lat());
        longitude_ = static_cast<float>(gps_.location.lng());
    }
    hasFix_ = freshFix;

    if (gps_.satellites.isValid() && gps_.satellites.age() < HEATSHIELD_GPS_MAX_FIX_AGE_MS) {
        uint32_t count = gps_.satellites.value();
        satellites_ = static_cast<uint8_t>(count > 255 ? 255 : count);
    } else {
        satellites_ = 0;
    }
}
