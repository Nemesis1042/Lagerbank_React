# 🏕️ Lagerbank React

Ein modernes Camp-Management-System für Jugendlager, entwickelt mit React und Node.js. Lagerbank ermöglicht die Verwaltung von Teilnehmern, Produkten, Transaktionen und bietet eine integrierte Kassenfunktion mit NFC-Unterstützung.

## 📊 Projektstatistiken

Das Projekt umfasst **230.712 Zeilen Code** aufgeteilt auf:

- **TypeScript Dateien**: 34.386 Zeilen
- **JavaScript/JSX Dateien**: 17.424 Zeilen  
- **CSS Dateien**: 3.392 Zeilen
- **HTML Dateien**: 1.405 Zeilen
- **Arduino Dateien (.ino/.h)**: 797 Zeilen
- **SQL Dateien**: 115 Zeilen

## 🚀 Features

### 🎯 Kernfunktionen
- **Teilnehmerverwaltung**: Check-in/Check-out, Guthaben-Management
- **Produktverwaltung**: Lagerbestand, Preise, Barcodes
- **Kassensystem**: Standard-, Click- und NFC-Kasse
- **Transaktionsverwaltung**: Vollständige Kaufhistorie mit Storno-Funktion
- **Dashboard**: Übersicht über Umsätze, Bestände und Statistiken

### 🔧 Erweiterte Features
- **NFC-Integration**: Kontaktloses Bezahlen mit NFC-Karten
- **Arduino-Display**: Externe Anzeigen für Guthaben und Preise
- **Audit-Log**: Vollständige Nachverfolgung aller Aktionen
- **Datenexport**: CSV-Export für Berichte und Analysen
- **Backup-System**: Automatische Datensicherung
- **Multi-Camp-Support**: Verwaltung mehrerer Lager

### 🎨 Benutzeroberfläche
- **Responsive Design**: Optimiert für Desktop, Tablet und Mobile
- **Dark/Light Mode**: Automatische Theme-Erkennung
- **Moderne UI**: Basiert auf shadcn/ui und Tailwind CSS
- **Barcode-Scanner**: Integrierte Barcode-Erkennung
- **Toast-Benachrichtigungen**: Benutzerfreundliche Rückmeldungen

## 🏗️ Technologie-Stack

### Frontend
- **React 18** - Moderne UI-Bibliothek
- **Vite** - Schneller Build-Tool
- **TypeScript** - Typsichere Entwicklung
- **Tailwind CSS** - Utility-First CSS Framework
- **shadcn/ui** - Hochwertige UI-Komponenten
- **React Router** - Client-seitiges Routing
- **Recharts** - Datenvisualisierung
- **Framer Motion** - Animationen

### Backend
- **Node.js 18+** - JavaScript Runtime
- **Express.js** - Web-Framework
- **MySQL/MariaDB** - Relationale Datenbank
- **CORS** - Cross-Origin Resource Sharing

### Hardware-Integration
- **Arduino** - Externe Displays (OLED, TM1637)
- **NFC-Reader** - Kontaktlose Kartenerkennung

## 📋 Voraussetzungen

### Software
- **Node.js** 18.0.0 oder höher
- **MySQL** oder **MariaDB** 10.3+
- **Git** für Versionskontrolle
- **npm** oder **yarn** als Package Manager

### Hardware (Optional)
- **NFC-Reader** für kontaktloses Bezahlen
- **Arduino** mit OLED/TM1637 Display für externe Anzeigen
- **Barcode-Scanner** für Produkterfassung

## 🛠️ Installation

### 1. Repository klonen
```bash
git clone git@github.com:Nemesis1042/Lagerbank_React.git
cd Lagerbank_React
```

### 2. Datenbank einrichten
```bash
# MySQL/MariaDB starten
sudo systemctl start mysql

# Datenbank erstellen
mysql -u root -p < backend/schema.sql
```

### 3. Backend installieren und starten
```bash
cd backend
npm install

# Umgebungsvariablen konfigurieren (optional)
cp .env.example .env
# .env Datei bearbeiten mit Datenbankverbindung

# Backend starten
npm run dev
```

### 4. Frontend installieren und starten
```bash
cd ../frontend
npm install

# Frontend starten
npm run dev
```

### 5. Anwendung öffnen
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## 🐳 Docker Installation (Alternative)

```bash
# Mit Docker Compose starten
docker-compose up -d

# Datenbank initialisieren
docker-compose exec db mysql -u root -p lagerbank < backend/schema.sql
```

## 🔧 Konfiguration

### Backend (.env)
```env
# Datenbank
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lagerbank

# Server
PORT=3000
NODE_ENV=development

# Sicherheit
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password
```

### Frontend
Die Frontend-Konfiguration erfolgt über die API-Endpunkte im Backend.

## 📱 Verwendung

### Erste Schritte
1. **Camp erstellen**: Neues Lager in den Einstellungen anlegen
2. **Teilnehmer importieren**: CSV-Import oder manuell hinzufügen
3. **Produkte anlegen**: Artikel mit Preisen und Beständen erfassen
4. **Kasse öffnen**: Verkäufe über Standard-, Click- oder NFC-Kasse

### Kassensysteme
- **Standard-Kasse**: Manuelle Eingabe von Teilnehmer und Produkten
- **Click-Kasse**: Schnelle Produktauswahl per Klick
- **NFC-Kasse**: Kontaktloses Bezahlen mit NFC-Karten

### Berichte und Export
- **Dashboard**: Tagesübersicht mit Umsätzen und Statistiken
- **Audit-Log**: Vollständige Aktionshistorie
- **CSV-Export**: Datenexport für externe Analysen

## 🔌 Arduino Integration

### Unterstützte Displays
- **OLED Display** (SSD1306): Guthaben und Produktpreise
- **TM1637 Display**: Numerische Anzeigen
- **I2C Scanner**: Automatische Geräteerkennung

### Installation
```bash
# Arduino-Code hochladen
cd arduino_display
# Code in Arduino IDE öffnen und auf Gerät hochladen
```

## 🧪 Entwicklung

### Entwicklungsserver starten
```bash
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2)  
cd frontend && npm run dev
```

### Code-Qualität
```bash
# Linting
npm run lint

# Tests ausführen
npm test

# Build für Produktion
npm run build
```

### Projektstruktur
```
Lagerbank_React/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # UI-Komponenten
│   │   ├── pages/          # Seiten-Komponenten
│   │   ├── api/            # API-Client
│   │   ├── hooks/          # Custom Hooks
│   │   └── utils/          # Hilfsfunktionen
│   └── public/             # Statische Dateien
├── backend/                 # Node.js Backend
│   ├── server.js           # Hauptserver
│   ├── schema.sql          # Datenbankschema
│   └── package.json        # Dependencies
├── arduino_display/         # Arduino-Code
│   ├── external_display.ino
│   ├── config.h
│   └── README.md
└── README.md               # Diese Datei
```

## 🚀 Deployment

### Raspberry Pi (Empfohlen)
Siehe [install.md](install.md) für eine vollständige Raspberry Pi Installation.

### Produktionsserver
```bash
# Build erstellen
cd frontend && npm run build
cd ../backend && npm install --production

# Mit PM2 starten
pm2 start backend/server.js --name lagerbank-backend
pm2 startup
pm2 save
```

## 🤝 Beitragen

1. Fork des Repositories erstellen
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📄 Lizenz

Dieses Projekt steht unter der ISC Lizenz. Siehe [LICENSE](LICENSE) für Details.

## 🆘 Support

Bei Fragen oder Problemen:
- **Issues**: GitHub Issues für Bug-Reports und Feature-Requests
- **Dokumentation**: Siehe `/docs` Ordner für detaillierte Anleitungen
- **Wiki**: Weitere Informationen im GitHub Wiki

## 🙏 Danksagungen

- **shadcn/ui** für die exzellenten UI-Komponenten
- **Radix UI** für die zugänglichen Primitives
- **Tailwind CSS** für das utility-first CSS Framework
- **React Community** für die großartige Bibliothek

---

**Entwickelt mit ❤️ für Jugendlager und Camps**
