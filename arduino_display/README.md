# Externes Display für Lagerbank System

Dieses Projekt ermöglicht die Anzeige von Teilnehmer-Nummern (TN-Nummern) auf einem externen Display, das über USB mit einem Arduino-Mikrocontroller verbunden ist.

## 📋 Übersicht

Das System besteht aus:
- Arduino C++ Code für Mikrocontroller
- Kompatibilität mit der Lagerbank React Web-Anwendung
- Unterstützung für LCD, OLED und TM1637 4-Digit Displays
- USB-Kommunikation über Web Serial API

## 🛠 Hardware Anforderungen

### Mikrocontroller
- Arduino Uno/Nano/Pro Mini
- Arduino ESP32-DevKit
- Oder ähnlicher kompatibler Mikrocontroller

### Display Optionen

#### Option 1: TM1637 4-Digit Display (EMPFOHLEN)
- TM1637 4-Digit 7-Segment Display (0.56" oder 1.2")
- Nur 2 Steuerpins erforderlich (CLK + DIO)
- Sehr hell und gut lesbar
- Günstig und einfach zu verwenden
- Nutzt nur die ersten 2 Stellen für TN-Nummern (0-99)

#### Option 2: LCD Display (16x2)
- LCD Display mit I2C Interface
- Beispiel: HD44780 mit I2C Backpack

#### Option 3: OLED Display (128x64)
- OLED Display mit I2C Interface
- Beispiel: SSD1306 OLED

### Zusätzliche Komponenten
- 5V USB Netzteil (≥500 mA)
- USB Kabel (A zu B für Arduino Uno, oder Micro-USB/USB-C je nach Board)
- Breadboard oder Lochrasterplatine (optional)
- Jumper-Kabel (nur 4 Stück für TM1637)

## 🔌 Schaltplan

### LCD Display (16x2) Anschlüsse
```
Arduino Uno/Nano:
LCD VCC  -> 5V
LCD GND  -> GND
LCD SDA  -> A4
LCD SCL  -> A5

ESP32:
LCD VCC  -> 3.3V oder 5V
LCD GND  -> GND
LCD SDA  -> GPIO21
LCD SCL  -> GPIO22
```

### OLED Display (128x64) Anschlüsse
```
Arduino Uno/Nano:
OLED VCC -> 3.3V oder 5V
OLED GND -> GND
OLED SDA -> A4
OLED SCL -> A5

ESP32:
OLED VCC -> 3.3V
OLED GND -> GND
OLED SDA -> GPIO21
OLED SCL -> GPIO22
```

### TM1637 4-Digit Display Anschlüsse (EMPFOHLEN)
```
Arduino Uno/Nano:
TM1637 VCC -> 5V
TM1637 GND -> GND
TM1637 CLK -> Pin 2
TM1637 DIO -> Pin 3

ESP32:
TM1637 VCC -> 5V
TM1637 GND -> GND
TM1637 CLK -> GPIO 18
TM1637 DIO -> GPIO 19
```

## 📚 Benötigte Bibliotheken

### Für LCD Display
1. **LiquidCrystal_I2C**
   - Installation über Arduino IDE: Sketch → Include Library → Manage Libraries
   - Suche nach "LiquidCrystal_I2C" von Frank de Brabander

### Für TM1637 4-Digit Display (EMPFOHLEN)
1. **TM1637Display**
   - Installation über Arduino IDE: Sketch → Include Library → Manage Libraries
   - Suche nach "TM1637Display" von Avishay Orpaz

### Für OLED Display
1. **Adafruit SSD1306**
   - Installation über Arduino IDE: Sketch → Include Library → Manage Libraries
   - Suche nach "Adafruit SSD1306"

2. **Adafruit GFX Library**
   - Wird automatisch als Abhängigkeit installiert
   - Oder manuell: Suche nach "Adafruit GFX"

## 🚀 Installation und Setup

### 1. Arduino IDE Setup
1. Arduino IDE herunterladen und installieren (https://www.arduino.cc/en/software)
2. Entsprechende Board-Unterstützung installieren:
   - Für ESP32: File → Preferences → Additional Board Manager URLs: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools → Board → Boards Manager → ESP32 installieren

### 2. Hardware aufbauen
1. Verbinde das Display gemäß Schaltplan mit dem Arduino
2. Verbinde den Arduino über USB mit dem Computer

### 3. Code hochladen
1. Öffne die entsprechende .ino Datei in der Arduino IDE:
   - `external_display_tm1637.ino` für TM1637 4-Digit Display (EMPFOHLEN)
   - `external_display.ino` für LCD Display
   - `external_display_oled.ino` für OLED Display

2. Wähle das richtige Board und Port:
   - Tools → Board → [Dein Arduino Board]
   - Tools → Port → [Entsprechender COM/USB Port]

3. Installiere die benötigten Bibliotheken (siehe oben)

4. Lade den Code hoch: Sketch → Upload (Ctrl+U)

### 4. I2C Adresse finden (falls nötig)
Falls das Display nicht funktioniert, könnte die I2C Adresse falsch sein:

```cpp
// I2C Scanner Code (separates Sketch)
#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  Serial.println("I2C Scanner");
}

void loop() {
  byte error, address;
  int nDevices;
  
  Serial.println("Scanning...");
  nDevices = 0;
  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address<16) Serial.print("0");
      Serial.print(address,HEX);
      Serial.println("  !");
      nDevices++;
    }
  }
  if (nDevices == 0) Serial.println("No I2C devices found\n");
  else Serial.println("done\n");
  
  delay(5000);
}
```

## 💻 Web-Anwendung Setup

### Browser-Kompatibilität
Die Web Serial API wird unterstützt von:
- Google Chrome (Version 89+)
- Microsoft Edge (Version 89+)
- Opera (Version 75+)

**Nicht unterstützt:** Firefox, Safari

### Verwendung
1. Starte die Lagerbank React Anwendung
2. Navigiere zu einer Seite mit der ExternalDisplay Komponente
3. Klicke auf "Display verbinden"
4. Wähle den entsprechenden COM/USB Port aus
5. Das Display sollte nun die TN-Nummern anzeigen

## 🔧 Konfiguration

### Display-Einstellungen anpassen

#### LCD Display
```cpp
// In external_display.ino
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Adresse, Spalten, Zeilen

// Häufige I2C Adressen: 0x27, 0x3F, 0x20, 0x38
```

#### OLED Display
```cpp
// In external_display_oled.ino
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define SCREEN_ADDRESS 0x3C  // Häufige Adressen: 0x3C, 0x3D
```

### Timeout anpassen
```cpp
const unsigned long DISPLAY_TIMEOUT = 30000; // 30 Sekunden in Millisekunden
```

## 🐛 Fehlerbehebung

### Display zeigt nichts an
1. **Stromversorgung prüfen:** Ist das Display korrekt mit Strom versorgt?
2. **Verkabelung prüfen:** Sind SDA und SCL richtig verbunden?
3. **I2C Adresse prüfen:** Verwende den I2C Scanner Code
4. **Bibliotheken prüfen:** Sind alle Bibliotheken korrekt installiert?

### Verbindung funktioniert nicht
1. **Browser prüfen:** Verwende Chrome oder Edge
2. **USB Kabel prüfen:** Ist es ein Datenkabel (nicht nur Ladekabel)?
3. **Port prüfen:** Ist der richtige COM/USB Port ausgewählt?
4. **Treiber prüfen:** Sind die Arduino Treiber installiert?

### Display zeigt falsche Zeichen
1. **Baudrate prüfen:** Muss 9600 sein
2. **Zeichenkodierung:** Prüfe auf Sonderzeichen in TN-Nummern

## 📝 Protokoll

### Serielle Kommunikation
- **Baudrate:** 9600
- **Format:** TN-Nummer + Zeilenumbruch (\n)
- **Beispiel:** "12345\n"
- **Antwort:** "OK: 12345\n"

### Kommandos
- Sende TN-Nummer: `"123\n"`
- Reset Display: `"---\n"`
- Leeres Display: `"\n"`

## 🔄 Erweiterte Features

### Zusätzliche Funktionen implementieren
Der Code kann erweitert werden um:
- Mehrere Zeilen Text
- Grafische Elemente
- Animationen
- Buzzer für akustische Signale
- LED-Anzeigen
- Temperatur/Zeit Anzeige

### Beispiel Erweiterung - Buzzer
```cpp
#define BUZZER_PIN 8

void setup() {
  // ... bestehender Code
  pinMode(BUZZER_PIN, OUTPUT);
}

void playBeep() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
}
```

## 📄 Lizenz

Dieses Projekt ist Teil des Lagerbank Systems und unterliegt der gleichen Lizenz.

## 🤝 Beitragen

Bei Problemen oder Verbesserungsvorschlägen erstelle bitte ein Issue im Hauptrepository.

## 📞 Support

Bei technischen Problemen:
1. Prüfe die Fehlerbehebung oben
2. Überprüfe die Hardware-Verbindungen
3. Teste mit dem I2C Scanner
4. Erstelle ein Issue mit detaillierter Fehlerbeschreibung
