/*
 * Externes OLED Display für TN-Nummer Anzeige
 * Kompatibel mit der Lagerbank React Anwendung
 * 
 * Hardware Anforderungen:
 * - Arduino Uno/Nano/ESP32 oder ähnlicher Mikrocontroller
 * - OLED Display (128x64) mit I2C Interface (SSD1306)
 * - USB Kabel für Verbindung zum Computer
 * 
 * Bibliotheken:
 * - Adafruit_SSD1306
 * - Adafruit_GFX
 * 
 * Anschlüsse:
 * - OLED SDA -> Arduino A4 (Uno) / GPIO21 (ESP32)
 * - OLED SCL -> Arduino A5 (Uno) / GPIO22 (ESP32)
 * - OLED VCC -> 3.3V oder 5V
 * - OLED GND -> GND
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED Display Konfiguration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Variablen
String receivedData = "";
String currentTN = "---";
unsigned long lastUpdateTime = 0;
const unsigned long DISPLAY_TIMEOUT = 30000; // 30 Sekunden Timeout

void setup() {
  // Serielle Kommunikation initialisieren
  Serial.begin(9600);
  
  // OLED Display initialisieren
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Endlosschleife bei Fehler
  }
  
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  // Willkommensnachricht
  showWelcomeScreen();
  delay(2000);
  
  // Standard TN anzeigen
  displayTN("---");
  
  Serial.println("Arduino OLED Display bereit");
}

void loop() {
  // Prüfe auf eingehende serielle Daten
  if (Serial.available() > 0) {
    receivedData = Serial.readStringUntil('\n');
    receivedData.trim(); // Entferne Leerzeichen und Zeilenumbrüche
    
    if (receivedData.length() > 0) {
      currentTN = receivedData;
      displayTN(currentTN);
      lastUpdateTime = millis();
      
      // Bestätigung zurücksenden
      Serial.println("OK: " + currentTN);
    }
  }
  
  // Timeout prüfen - nach 30 Sekunden ohne Update auf "---" zurücksetzen
  if (millis() - lastUpdateTime > DISPLAY_TIMEOUT && currentTN != "---") {
    currentTN = "---";
    displayTN(currentTN);
  }
  
  delay(100); // Kleine Verzögerung für Stabilität
}

void showWelcomeScreen() {
  display.clearDisplay();
  
  // Titel
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println("Lagerbank");
  
  // Untertitel
  display.setTextSize(1);
  display.setCursor(0, 20);
  display.println("System");
  
  // Status
  display.setCursor(0, 40);
  display.println("Bereit...");
  
  display.display();
}

void displayTN(String tnNumber) {
  display.clearDisplay();
  
  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("CVJM Lagerbank");
  
  // Trennlinie
  display.drawLine(0, 12, SCREEN_WIDTH, 12, SSD1306_WHITE);
  
  // Label
  display.setTextSize(1);
  display.setCursor(0, 20);
  display.println("Teilnehmer-Nummer:");
  
  // TN-Nummer groß und zentriert
  display.setTextSize(3);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(tnNumber, 0, 0, &x1, &y1, &w, &h);
  int x = (SCREEN_WIDTH - w) / 2;
  int y = 35;
  
  display.setCursor(x, y);
  display.println(tnNumber);
  
  // Zeitstempel (optional)
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print("Zeit: ");
  display.print(millis() / 1000);
  display.print("s");
  
  display.display();
}

void displayError(String errorMsg) {
  display.clearDisplay();
  
  // Fehler Header
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println("FEHLER");
  
  // Fehlermeldung
  display.setTextSize(1);
  display.setCursor(0, 20);
  display.println(errorMsg);
  
  display.display();
}

void displayStatus(String status) {
  display.clearDisplay();
  
  // Status Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Status:");
  
  // Status Text
  display.setTextSize(2);
  display.setCursor(0, 15);
  display.println(status);
  
  display.display();
}

void displayConnectionStatus(bool connected) {
  display.clearDisplay();
  
  if (connected) {
    display.setTextSize(2);
    display.setCursor(10, 20);
    display.println("VERBUNDEN");
    
    display.setTextSize(1);
    display.setCursor(0, 45);
    display.println("Warte auf Daten...");
  } else {
    display.setTextSize(2);
    display.setCursor(5, 20);
    display.println("GETRENNT");
    
    display.setTextSize(1);
    display.setCursor(0, 45);
    display.println("Warte auf Verbindung");
  }
  
  display.display();
}
