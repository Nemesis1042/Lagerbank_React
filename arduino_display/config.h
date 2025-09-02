/*
 * Konfigurationsdatei für Arduino Display System
 * 
 * Diese Datei enthält alle wichtigen Einstellungen für verschiedene
 * Display-Typen und Mikrocontroller-Kombinationen.
 * 
 * Verwendung:
 * 1. Kopiere diese Datei in den gleichen Ordner wie deine .ino Datei
 * 2. Passe die Einstellungen an deine Hardware an
 * 3. Inkludiere diese Datei in deinem Hauptcode: #include "config.h"
 */

#ifndef CONFIG_H
#define CONFIG_H

// ========================================
// DISPLAY TYP AUSWAHL
// ========================================
// Kommentiere den gewünschten Display-Typ ein:

#define USE_LCD_DISPLAY     // Für LCD 16x2 mit I2C
// #define USE_OLED_DISPLAY    // Für OLED 128x64 mit I2C

// ========================================
// MIKROCONTROLLER AUSWAHL
// ========================================
// Automatische Erkennung basierend auf Board-Definition

#if defined(ESP32)
    #define BOARD_ESP32
    #define SDA_PIN 21
    #define SCL_PIN 22
#elif defined(ESP8266)
    #define BOARD_ESP8266
    #define SDA_PIN 4   // D2
    #define SCL_PIN 5   // D1
#elif defined(ARDUINO_AVR_UNO) || defined(ARDUINO_AVR_NANO)
    #define BOARD_ARDUINO_UNO_NANO
    #define SDA_PIN A4
    #define SCL_PIN A5
#elif defined(ARDUINO_AVR_MEGA2560)
    #define BOARD_ARDUINO_MEGA
    #define SDA_PIN 20
    #define SCL_PIN 21
#else
    #define BOARD_GENERIC
    #define SDA_PIN A4
    #define SCL_PIN A5
#endif

// ========================================
// LCD DISPLAY EINSTELLUNGEN
// ========================================
#ifdef USE_LCD_DISPLAY
    // I2C Adresse (häufigste Adressen: 0x27, 0x3F, 0x20, 0x38)
    #define LCD_I2C_ADDRESS 0x27
    
    // Display Größe
    #define LCD_COLUMNS 16
    #define LCD_ROWS 2
    
    // Anzeigetext
    #define LCD_TITLE "Lagerbank System"
    #define LCD_LABEL "TN-Nummer:"
    #define LCD_READY_MSG "Bereit..."
    #define LCD_ERROR_MSG "FEHLER:"
#endif

// ========================================
// OLED DISPLAY EINSTELLUNGEN
// ========================================
#ifdef USE_OLED_DISPLAY
    // Display Spezifikationen
    #define SCREEN_WIDTH 128
    #define SCREEN_HEIGHT 64
    #define OLED_RESET -1
    
    // I2C Adresse (häufigste Adressen: 0x3C, 0x3D)
    #define SCREEN_ADDRESS 0x3C
    
    // Anzeigetext
    #define OLED_TITLE "Lagerbank"
    #define OLED_SUBTITLE "System"
    #define OLED_LABEL "Teilnehmer-Nummer:"
    #define OLED_READY_MSG "Bereit..."
    #define OLED_ERROR_MSG "FEHLER"
    #define OLED_CONNECTED_MSG "VERBUNDEN"
    #define OLED_DISCONNECTED_MSG "GETRENNT"
#endif

// ========================================
// SERIELLE KOMMUNIKATION
// ========================================
#define SERIAL_BAUD_RATE 9600
#define SERIAL_TIMEOUT 1000

// ========================================
// TIMING EINSTELLUNGEN
// ========================================
#define DISPLAY_TIMEOUT 30000       // 30 Sekunden bis Reset auf "---"
#define WELCOME_SCREEN_DURATION 2000 // 2 Sekunden Willkommensnachricht
#define LOOP_DELAY 100              // 100ms Verzögerung in main loop
#define SCAN_DELAY 5000             // 5 Sekunden zwischen I2C Scans

// ========================================
// STANDARD WERTE
// ========================================
#define DEFAULT_TN_NUMBER "---"
#define EMPTY_TN_NUMBER ""
#define MAX_TN_LENGTH 10

// ========================================
// DEBUG EINSTELLUNGEN
// ========================================
// Kommentiere ein für Debug-Ausgaben:
// #define DEBUG_MODE

#ifdef DEBUG_MODE
    #define DEBUG_PRINT(x) Serial.print(x)
    #define DEBUG_PRINTLN(x) Serial.println(x)
#else
    #define DEBUG_PRINT(x)
    #define DEBUG_PRINTLN(x)
#endif

// ========================================
// ERWEITERTE FEATURES (Optional)
// ========================================
// Kommentiere ein um Features zu aktivieren:

// #define ENABLE_BUZZER           // Akustische Signale
// #define ENABLE_LED_STATUS       // Status LEDs
// #define ENABLE_BUTTON_INPUT     // Taster für manuelle Eingabe
// #define ENABLE_TEMPERATURE      // Temperaturanzeige
// #define ENABLE_CLOCK            // Uhrzeitanzeige

#ifdef ENABLE_BUZZER
    #define BUZZER_PIN 8
    #define BEEP_DURATION 100
#endif

#ifdef ENABLE_LED_STATUS
    #define LED_CONNECTED_PIN 13
    #define LED_ERROR_PIN 12
#endif

#ifdef ENABLE_BUTTON_INPUT
    #define BUTTON_PIN 2
    #define BUTTON_DEBOUNCE_DELAY 50
#endif

// ========================================
// FEHLERCODES
// ========================================
#define ERROR_NONE 0
#define ERROR_DISPLAY_INIT 1
#define ERROR_I2C_CONNECTION 2
#define ERROR_SERIAL_TIMEOUT 3
#define ERROR_INVALID_DATA 4

// ========================================
// HILFSMAKROS
// ========================================
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof(arr[0]))
#define MIN(a,b) ((a)<(b)?(a):(b))
#define MAX(a,b) ((a)>(b)?(a):(b))

#endif // CONFIG_H
