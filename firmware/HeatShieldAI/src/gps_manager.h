// gps_manager.h
// -------------
// GpsManager: reads NMEA sentences from a NEO-6M GPS module over a
// dedicated hardware UART and exposes the latest latitude/longitude, in the
// same "degrade, don't crash" style as the rest of this firmware. A missing
// module or a lost/never-acquired fix just means gpsFixValid stays false in
// the outgoing LoRa packet -- it never blocks or hangs the main loop.

#ifndef HEATSHIELD_GPS_MANAGER_H
#define HEATSHIELD_GPS_MANAGER_H

#include <Arduino.h>
#include <TinyGPSPlus.h>

// ---- Pin assignments: ESP32-S3-WROOM-1 ----
// Clear of every pin already used elsewhere in this firmware (DHT22=4,
// I2C/MAX30102+OLED=8/9, LoRa SPI=6/10-14, buzzer=17, vibration motor=18)
// and clear of the S3's flash/PSRAM bus, strapping pins, and native-USB
// pins (see sensors.h for the full rationale). Uses UART1 (Serial1) so
// UART0 (the USB-serial bridge used for debug Serial output) is untouched.
#define HEATSHIELD_GPS_RX_PIN 15  // ESP32 RX <- GPS TX
#define HEATSHIELD_GPS_TX_PIN 16  // ESP32 TX -> GPS RX (NEO-6M rarely needs this, wired for completeness)
#define HEATSHIELD_GPS_BAUD 9600  // NEO-6M factory-default NMEA baud rate

// A fix older than this is treated as "no fix" rather than reporting a
// stale/frozen position -- e.g. if the module loses satellite lock or is
// unplugged mid-run.
static const uint32_t HEATSHIELD_GPS_MAX_FIX_AGE_MS = 10000;

class GpsManager {
public:
    // Starts Serial1 on the pins/baud above. Never blocks waiting for a fix
    // -- satellite acquisition can take anywhere from a few seconds (warm
    // start, open sky) to a couple of minutes (cold start), so the rest of
    // the firmware keeps running normally while a fix is pending.
    void begin();

    // Feeds any bytes currently waiting in the UART buffer into the NMEA
    // parser. Cheap and non-blocking -- call this often (every loop()
    // iteration, including inside main.cpp's alert/display polling window)
    // so the buffer never backs up during the ~4-8s blocking MAX30102 read.
    void update();

    // True only if a fix has been acquired AND it isn't older than
    // HEATSHIELD_GPS_MAX_FIX_AGE_MS. False from boot until the first fix,
    // and false again if the module stops updating.
    bool hasFix() const { return hasFix_; }
    float latitude() const { return latitude_; }
    float longitude() const { return longitude_; }
    uint8_t satellites() const { return satellites_; }

private:
    TinyGPSPlus gps_;
    bool hasFix_ = false;
    float latitude_ = 0.0f;
    float longitude_ = 0.0f;
    uint8_t satellites_ = 0;
};

#endif  // HEATSHIELD_GPS_MANAGER_H
