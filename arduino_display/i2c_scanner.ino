/*
 * I2C Scanner für Arduino
 * Findet alle angeschlossenen I2C Geräte und zeigt deren Adressen an
 * 
 * Verwendung:
 * 1. Code auf Arduino hochladen
 * 2. Seriellen Monitor öffnen (9600 Baud)
 * 3. Gefundene Adressen notieren und in den Hauptcode eintragen
 */

#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  while (!Serial); // Warte auf serielle Verbindung
  
  Serial.println("\nI2C Scanner");
  Serial.println("Suche nach I2C Geräten...");
}

void loop() {
  byte error, address;
  int nDevices;

  Serial.println("Scanning...");

  nDevices = 0;
  for(address = 1; address < 127; address++) {
    // Der i2c_scanner verwendet die return value von
    // Wire.endTransmission um zu sehen ob ein Gerät antwortet
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("I2C Gerät gefunden bei Adresse 0x");
      if (address < 16) 
        Serial.print("0");
      Serial.print(address, HEX);
      Serial.println("  !");

      nDevices++;
    }
    else if (error == 4) {
      Serial.print("Unbekannter Fehler bei Adresse 0x");
      if (address < 16) 
        Serial.print("0");
      Serial.println(address, HEX);
    }    
  }
  
  if (nDevices == 0)
    Serial.println("Keine I2C Geräte gefunden\n");
  else {
    Serial.print("Fertig. ");
    Serial.print(nDevices);
    Serial.println(" Gerät(e) gefunden.\n");
  }

  delay(5000); // Warte 5 Sekunden für nächsten Scan
}
