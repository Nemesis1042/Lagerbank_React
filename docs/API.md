# Lagerbank API Dokumentation

## Übersicht

Die Lagerbank API ist eine RESTful API für die Verwaltung von Jugendlagern. Sie bietet Endpunkte für Teilnehmer, Produkte, Transaktionen, Lager und Einstellungen.

**Base URL:** `http://localhost:4000/api`

## Authentifizierung

Die API verwendet Session-basierte Authentifizierung für Admin-Funktionen.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "password": "admin_password",
  "username": "admin" // optional
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "abc123...",
  "authid": "admin",
  "userType": "admin"
}
```

### Logout
```http
POST /auth/logout
X-Session-Token: abc123...
```

### Session Status
```http
GET /auth/session
X-Session-Token: abc123...
```

## Entitäten

### Participant (Teilnehmer)

#### Alle Teilnehmer abrufen
```http
GET /entities/Participant
```

**Query Parameter:**
- `camp_id` (number): Filter nach Lager-ID
- `is_staff` (boolean): Filter nach Mitarbeiter-Status
- `is_checked_in` (boolean): Filter nach Check-in Status

**Response:**
```json
[
  {
    "id": 1,
    "tn_id": 123,
    "name": "Max Mustermann",
    "barcode_id": "12345",
    "balance": 25.50,
    "initial_balance": 50.00,
    "is_staff": false,
    "is_checked_in": true,
    "camp_id": 1,
    "camp_name": "Sommerlager 2024"
  }
]
```

#### Teilnehmer erstellen
```http
POST /entities/Participant
Content-Type: application/json

{
  "name": "Max Mustermann",
  "tn_id": 123,
  "balance": 50.00,
  "initial_balance": 50.00,
  "camp_id": 1,
  "camp_name": "Sommerlager 2024"
}
```

#### Teilnehmer aktualisieren
```http
PUT /entities/Participant/:id
Content-Type: application/json

{
  "name": "Max Mustermann",
  "balance": 25.50
}
```

#### Teilnehmer löschen
```http
DELETE /entities/Participant/:id
```

#### Bulk-Import von Teilnehmern
```http
POST /entities/Participant/bulk
Content-Type: application/json

[
  {
    "name": "Teilnehmer 1",
    "balance": 50.00,
    "camp_id": 1
  },
  {
    "name": "Teilnehmer 2",
    "balance": 30.00,
    "camp_id": 1
  }
]
```

### Product (Produkt)

#### Alle Produkte abrufen
```http
GET /entities/Product
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Cola",
    "price": 2.50,
    "icon": "🥤",
    "stock": 100,
    "barcode": "1234567890"
  }
]
```

#### Produkt erstellen
```http
POST /entities/Product
Content-Type: application/json

{
  "name": "Cola",
  "price": 2.50,
  "icon": "🥤",
  "stock": 100,
  "barcode": "1234567890"
}
```

#### Produkt aktualisieren
```http
PUT /entities/Product/:id
Content-Type: application/json

{
  "name": "Cola",
  "price": 2.00,
  "stock": 80
}
```

#### Produkt löschen
```http
DELETE /entities/Product/:id
```

### Transaction (Transaktion)

#### Alle Transaktionen abrufen
```http
GET /entities/Transaction
```

**Query Parameter:**
- `participant_id` (number): Filter nach Teilnehmer-ID
- `camp_id` (number): Filter nach Lager-ID
- `-created_at` (string): Sortierung nach Erstellungsdatum (absteigend)
- `limit` (number): Anzahl der Ergebnisse begrenzen

**Response:**
```json
[
  {
    "id": 1,
    "participant_id": 1,
    "product_id": 1,
    "camp_id": 1,
    "quantity": 2,
    "total_price": -5.00,
    "participant_name": "Max Mustermann",
    "product_name": "Cola",
    "camp_name": "Sommerlager 2024",
    "is_storno": false,
    "is_cancelled": false,
    "original_transaction_id": null,
    "created_at": "2024-08-29T10:30:00.000Z"
  }
]
```

#### Transaktion erstellen
```http
POST /entities/Transaction
Content-Type: application/json

{
  "participant_id": 1,
  "product_id": 1,
  "camp_id": 1,
  "quantity": 2,
  "total_price": -5.00,
  "participant_name": "Max Mustermann",
  "product_name": "Cola",
  "camp_name": "Sommerlager 2024"
}
```

#### Transaktion aktualisieren (Storno)
```http
PUT /entities/Transaction/:id
Content-Type: application/json

{
  "is_storno": true,
  "is_cancelled": true
}
```

### Camp (Lager)

#### Alle Lager abrufen
```http
GET /entities/Camp
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Sommerlager 2024",
    "start_date": "2024-07-15",
    "end_date": "2024-07-29",
    "location": "Berghütte Alpen",
    "is_active": true,
    "year": 2024,
    "description": "Unser jährliches Sommerlager",
    "require_positive_balance": false
  }
]
```

#### Lager erstellen
```http
POST /entities/Camp
Content-Type: application/json

{
  "name": "Sommerlager 2024",
  "start_date": "2024-07-15",
  "end_date": "2024-07-29",
  "location": "Berghütte Alpen",
  "year": 2024,
  "description": "Unser jährliches Sommerlager"
}
```

#### Lager aktualisieren
```http
PUT /entities/Camp/:id
Content-Type: application/json

{
  "name": "Sommerlager 2024",
  "is_active": true
}
```

#### Lager löschen
```http
DELETE /entities/Camp/:id?force=true
```

**Query Parameter:**
- `force` (boolean): Erzwingt das Löschen auch wenn noch Daten verknüpft sind

### AppSettings (Anwendungseinstellungen)

#### Einstellungen abrufen
```http
GET /entities/AppSettings
```

**Response:**
```json
[
  {
    "id": 1,
    "camp_name": "Sommerlager 2024",
    "currency_symbol": "€",
    "admin_password": "$2b$12$...",
    "active_camp_id": 1,
    "active_camp_name": "Sommerlager 2024"
  }
]
```

#### Einstellungen erstellen/aktualisieren
```http
POST /entities/AppSettings
Content-Type: application/json

{
  "camp_name": "Sommerlager 2024",
  "currency_symbol": "€",
  "admin_password": "neues_passwort",
  "active_camp_id": 1
}
```

### AuditLog (Audit-Protokoll)

#### Audit-Logs abrufen
```http
GET /entities/AuditLog
```

**Response:**
```json
[
  {
    "id": 1,
    "action": "transaction_created",
    "entity_type": "Transaction",
    "entity_id": "123",
    "details": "{\"participant_name\":\"Max Mustermann\"}",
    "authid": "admin",
    "camp_id": 1,
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2024-08-29T10:30:00.000Z"
  }
]
```

#### Audit-Log erstellen
```http
POST /entities/AuditLog
Content-Type: application/json

{
  "action": "custom_action",
  "entity_type": "Custom",
  "entity_id": "123",
  "details": "{\"custom\":\"data\"}",
  "camp_id": 1
}
```

## Fehlerbehandlung

Die API verwendet standardisierte HTTP-Statuscodes und gibt strukturierte Fehlermeldungen zurück.

### Erfolgreiche Antworten
- `200 OK` - Anfrage erfolgreich
- `201 Created` - Ressource erstellt

### Client-Fehler
- `400 Bad Request` - Ungültige Anfrage oder Validierungsfehler
- `401 Unauthorized` - Authentifizierung erforderlich
- `403 Forbidden` - Zugriff verweigert
- `404 Not Found` - Ressource nicht gefunden
- `409 Conflict` - Konflikt mit vorhandenen Daten

### Server-Fehler
- `500 Internal Server Error` - Interner Serverfehler
- `503 Service Unavailable` - Service nicht verfügbar

### Fehlerformat
```json
{
  "error": true,
  "message": "Validierungsfehler",
  "statusCode": 400,
  "timestamp": "2024-08-29T10:30:00.000Z",
  "details": [
    {
      "field": "name",
      "message": "Name ist erforderlich",
      "value": ""
    }
  ]
}
```

## Rate Limiting

Die API implementiert Rate Limiting um Missbrauch zu verhindern:

- **Allgemeine Anfragen:** 100 Anfragen pro 15 Minuten pro IP
- **Login-Versuche:** 5 Versuche pro 15 Minuten pro IP
- **Bulk-Operationen:** 10 Anfragen pro Stunde pro IP

## Validierung

Alle Eingaben werden validiert:

### Participant
- `name`: Erforderlich, 1-100 Zeichen
- `balance`: Dezimalzahl mit 2 Nachkommastellen
- `tn_id`: Positive Ganzzahl (optional)

### Product
- `name`: Erforderlich, 1-100 Zeichen
- `price`: Erforderlich, positive Dezimalzahl
- `stock`: Ganzzahl >= 0

### Transaction
- `participant_id`: Erforderlich, positive Ganzzahl
- `product_id`: Erforderlich, positive Ganzzahl
- `quantity`: Erforderlich, positive Ganzzahl
- `total_price`: Erforderlich, Dezimalzahl

## Sicherheit

### Authentifizierung
- Session-basierte Authentifizierung für Admin-Funktionen
- Sichere Passwort-Hashing mit bcrypt
- Session-Timeout nach 24 Stunden Inaktivität

### Input-Validierung
- Alle Eingaben werden validiert und sanitized
- SQL-Injection-Schutz durch Prepared Statements
- XSS-Schutz durch HTML-Escaping

### Security Headers
- CORS-Konfiguration
- Helmet.js für Security Headers
- Rate Limiting gegen Brute-Force-Angriffe

## Beispiele

### Vollständiger Workflow: Neuen Teilnehmer anlegen und Kauf durchführen

1. **Admin Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin"}'
```

2. **Teilnehmer erstellen:**
```bash
curl -X POST http://localhost:4000/api/entities/Participant \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: YOUR_TOKEN" \
  -d '{
    "name": "Max Mustermann",
    "balance": 50.00,
    "camp_id": 1
  }'
```

3. **Transaktion erstellen:**
```bash
curl -X POST http://localhost:4000/api/entities/Transaction \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: YOUR_TOKEN" \
  -d '{
    "participant_id": 1,
    "product_id": 1,
    "quantity": 2,
    "total_price": -5.00,
    "camp_id": 1
  }'
```

4. **Teilnehmer-Guthaben aktualisieren:**
```bash
curl -X PUT http://localhost:4000/api/entities/Participant/1 \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: YOUR_TOKEN" \
  -d '{"balance": 45.00}'
```

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-08-29T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640
  },
  "version": "1.0.0",
  "environment": "development"
}
```

## Versionierung

Aktuelle API-Version: **v1**

Die API-Versionierung erfolgt über die URL: `/api/v1/...` (geplant für zukünftige Versionen)

## Support

Bei Fragen oder Problemen:
- GitHub Issues: [Repository Issues](https://github.com/Nemesis1042/Lagerbank_React/issues)
- Dokumentation: Siehe README.md im Repository
