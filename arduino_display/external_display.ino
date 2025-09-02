/*
 * Externes Display für TN-Nummer Anzeige
 * Kompatibel mit der Lagerbank React Anwendung
 * 
 * Hardware Anforderungen:
 * - Arduino Uno/Nano/ESP32 oder ähnlicher Mikrocontroller
 * - LCD Display (16x2 oder 20x4) mit I2C Interface
 * - USB Kabel für Verbindung zum Computer
 * 
 * Bibliotheken:
 * - LiquidCrystal_I2C (für I2C LCD Display)
 * 
 * Anschlüsse:
 * - LCD SDA -> Arduino A4 (Uno) / GPIO21 (ESP32)
 * - LCD SCL -> Arduino A5 (Uno) / GPIO22 (ESP32)
 * - LCD VCC -> 5V
 * - LCD GND -> GND
 */

#include <LiquidCrystal_I2C.h>

// LCD Konfiguration (Adresse, Spalten, Zeilen)
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Standard I2C Adresse 0x27, 16x2 Display

// Variablen
String receivedData = "";
String currentTN = "---";
unsigned long lastUpdateTime = 0;
const unsigned long DISPLAY_TIMEOUT = 30000; // 30 Sekunden Timeout

void setup() {
  // Serielle Kommunikation initialisieren
  Serial.begin(9600);
  
  // LCD initialisieren
  lcd.init();
  lcd.backlight();
  
  // Willkommensnachricht
  lcd.setCursor(0, 0);
  lcd.print("Lagerbank System");
  lcd.setCursor(0, 1);
  lcd.print("Bereit...");
  
  delay(2000);
  
  // Display leeren und Standard anzeigen
  displayTN("---");
  
  Serial.println("Arduino Display bereit");
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

void displayTN(String tnNumber) {
  lcd.clear();
  
  // Erste Zeile: Label
  lcd.setCursor(0, 0);
  lcd.print("TN-Nummer:");
  
  // Zweite Zeile: TN-Nummer zentriert anzeigen
  lcd.setCursor(0, 1);
  
  // Zentriere die TN-Nummer auf dem Display
  int padding = (16 - tnNumber.length()) / 2;
  for (int i = 0; i < padding; i++) {
    lcd.print(" ");
  }
  
  lcd.print(tnNumber);
  
  // Fülle den Rest der Zeile mit Leerzeichen
  for (int i = padding + tnNumber.length(); i < 16; i++) {
    lcd.print(" ");
  }
}

// Funktion für Fehlermeldungen
void displayError(String errorMsg) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("FEHLER:");
  lcd.setCursor(0, 1);
  lcd.print(errorMsg.substring(0, 16)); // Maximal 16 Zeichen
}

// Funktion für Systemmeldungen
void displayStatus(String status) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Status:");
  lcd.setCursor(0, 1);
  lcd.print(status.substring(0, 16)); // Maximal 16 Zeichen
}
