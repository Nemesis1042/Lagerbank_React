/*
 * Externes TM1637 4-Digit Display für TN-Nummer Anzeige
 * Kompatibel mit der Lagerbank React Anwendung
 * 
 * Hardware Anforderungen:
 * - Arduino Uno/Nano oder ESP32-DevKit
 * - TM1637 4-Digit Display (0.56" oder 1.2")
 * - 5V USB Netzteil (≥500 mA)
 * - USB Kabel für Verbindung zum Computer
 * 
 * Bibliotheken:
 * - TM1637Display (von Avishay Orpaz)
 * 
 * Anschlüsse Arduino Uno/Nano:
 * - TM1637 VCC -> 5V
 * - TM1637 GND -> GND
 * - TM1637 CLK -> Pin 2
 * - TM1637 DIO -> Pin 3
 * 
 * Anschlüsse ESP32:
 * - TM1637 VCC -> 5V
 * - TM1637 GND -> GND
 * - TM1637 CLK -> GPIO 18
 * - TM1637 DIO -> GPIO 19
 */

#include <TM1637Display.h>

// Pin-Definitionen basierend auf Mikrocontroller
#if defined(ESP32)
  #define CLK_PIN 18
  #define DIO_PIN 19
#else
  // Arduino Uno/Nano
  #define CLK_PIN 2
  #define DIO_PIN 3
#endif

// TM1637 Display initialisieren
TM1637Display display(CLK_PIN, DIO_PIN);

// Variablen
String receivedData = "";
String currentTN = "---";
unsigned long lastUpdateTime = 0;
const unsigned long DISPLAY_TIMEOUT = 30000; // 30 Sekunden Timeout

// Display-Helligkeit (0-7, 7 = hellste)
const uint8_t BRIGHTNESS = 7;

// Segmente für Sonderzeichen
const uint8_t SEG_MINUS = 0b01000000;  // "-" Zeichen
const uint8_t SEG_BLANK = 0b00000000;  // Leer

void setup() {
  // Serielle Kommunikation initialisieren
  Serial.begin(9600);
  
  // Display initialisieren
  display.setBrightness(BRIGHTNESS);
  display.clear();
  
  // Willkommensnachricht: "Hi"
  showWelcomeMessage();
  delay(2000);
  
  // Standard TN anzeigen
  displayTN("---");
  
  Serial.println("Arduino TM1637 Display bereit");
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

void showWelcomeMessage() {
  // Zeige "Hi" als Willkommensnachricht
  uint8_t data[] = {
    0b01110110, // H
    0b00000110, // i
    SEG_BLANK,  // Leer
    SEG_BLANK   // Leer
  };
  display.setSegments(data);
}

void displayTN(String tnNumber) {
  if (tnNumber == "---" || tnNumber == "") {
    // Zeige "---" auf den ersten 3 Stellen
    uint8_t data[] = {
      SEG_MINUS,  // -
      SEG_MINUS,  // -
      SEG_BLANK,  // Leer (nutzen nur 2 Stellen)
      SEG_BLANK   // Leer
    };
    display.setSegments(data);
    return;
  }
  
  // Konvertiere TN-Nummer zu Integer
  int tnNum = tnNumber.toInt();
  
  if (tnNum == 0 && tnNumber != "0") {
    // Ungültige Nummer - zeige Fehler
    displayError();
    return;
  }
  
  // Begrenze auf 2 Stellen (0-99)
  if (tnNum > 99) {
    tnNum = tnNum % 100; // Nimm nur die letzten 2 Stellen
  }
  
  // Zeige Nummer auf den ersten 2 Stellen, Rest leer
  uint8_t data[4];
  
  if (tnNum < 10) {
    // Einstellige Zahl: zeige nur auf Position 1
    data[0] = SEG_BLANK;                    // Position 0: leer
    data[1] = display.encodeDigit(tnNum);   // Position 1: Zahl
    data[2] = SEG_BLANK;                    // Position 2: leer
    data[3] = SEG_BLANK;                    // Position 3: leer
  } else {
    // Zweistellige Zahl: zeige auf Position 0 und 1
    data[0] = display.encodeDigit(tnNum / 10);    // Position 0: Zehnerstelle
    data[1] = display.encodeDigit(tnNum % 10);    // Position 1: Einerstelle
    data[2] = SEG_BLANK;                          // Position 2: leer
    data[3] = SEG_BLANK;                          // Position 3: leer
  }
  
  display.setSegments(data);
}

void displayError() {
  // Zeige "Er" für Error
  uint8_t data[] = {
    0b01111001, // E
    0b01010000, // r
    SEG_BLANK,  // Leer
    SEG_BLANK   // Leer
  };
  display.setSegments(data);
}

void displayConnected() {
  // Zeige "Co" für Connected
  uint8_t data[] = {
    0b00111001, // C
    0b01011100, // o
    SEG_BLANK,  // Leer
    SEG_BLANK   // Leer
  };
  display.setSegments(data);
}

void displayDisconnected() {
  // Zeige "dc" für Disconnected
  uint8_t data[] = {
    0b01011110, // d
    0b00111001, // C
    SEG_BLANK,  // Leer
    SEG_BLANK   // Leer
  };
  display.setSegments(data);
}

void setBrightness(uint8_t brightness) {
  // Helligkeit setzen (0-7)
  if (brightness > 7) brightness = 7;
  display.setBrightness(brightness);
}

void testDisplay() {
  // Test-Sequenz für Display
  Serial.println("Starte Display-Test...");
  
  // Zeige alle Ziffern 0-9
  for (int i = 0; i <= 9; i++) {
    displayTN(String(i));
    delay(500);
  }
  
  // Zeige zweistellige Zahlen
  for (int i = 10; i <= 99; i += 10) {
    displayTN(String(i));
    delay(500);
  }
  
  // Zeige Sonderfunktionen
  displayError();
  delay(1000);
  
  displayConnected();
  delay(1000);
  
  displayDisconnected();
  delay(1000);
  
  // Zurück zu Standard
  displayTN("---");
  Serial.println("Display-Test beendet.");
}

// Funktion für serielle Kommandos (optional)
void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("BRIGHTNESS:")) {
      int brightness = command.substring(11).toInt();
      setBrightness(brightness);
      Serial.println("Helligkeit gesetzt auf: " + String(brightness));
    }
    else if (command == "TEST") {
      testDisplay();
    }
    else if (command == "CLEAR") {
      display.clear();
      Serial.println("Display gelöscht");
    }
    else {
      // Normale TN-Nummer
      currentTN = command;
      displayTN(currentTN);
      lastUpdateTime = millis();
      Serial.println("OK: " + currentTN);
    }
  }
}
