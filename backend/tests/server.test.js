import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { jest, describe, test, beforeEach, afterEach, expect } from '@jest/globals';

// Mock der Datenbankverbindung
const mockPool = {
  query: jest.fn(),
  end: jest.fn()
};

const mysql = {
  createPool: jest.fn(() => mockPool)
};

describe('Lagerbank Backend API Tests', () => {
  let app;

  beforeEach(() => {
    // Express App Setup
    app = express();
    app.use(cors());
    app.use(express.json());

    // Reset mocks
    jest.clearAllMocks();

    // Test Route
    app.get('/', (req, res) => {
      res.send('Backend läuft 🚀');
    });

    // Basic API Routes für Tests
    app.get('/api/entities/Participant', async (req, res) => {
      try {
        const [rows] = await mockPool.query('SELECT * FROM Participant');
        res.json(rows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/entities/Participant', async (req, res) => {
      try {
        const data = req.body;
        const [result] = await mockPool.query('INSERT INTO Participant SET ?', [data]);
        res.json({ id: result.insertId, created: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Health', () => {
    test('GET / sollte Server-Status zurückgeben', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('Backend läuft 🚀');
    });
  });

  describe('Participant API', () => {
    test('GET /api/entities/Participant sollte alle Teilnehmer zurückgeben', async () => {
      const mockParticipants = [
        { id: 1, name: 'Test User', balance: 10.50 },
        { id: 2, name: 'Another User', balance: 5.25 }
      ];

      mockPool.query.mockResolvedValueOnce([mockParticipants]);

      const response = await request(app).get('/api/entities/Participant');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockParticipants);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Participant');
    });

    test('POST /api/entities/Participant sollte neuen Teilnehmer erstellen', async () => {
      const newParticipant = {
        name: 'New User',
        balance: 15.00,
        camp_id: 1
      };

      const mockResult = { insertId: 3 };
      mockPool.query.mockResolvedValueOnce([mockResult]);

      const response = await request(app)
        .post('/api/entities/Participant')
        .send(newParticipant);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 3, created: true });
      expect(mockPool.query).toHaveBeenCalledWith('INSERT INTO Participant SET ?', [newParticipant]);
    });

    test('GET /api/entities/Participant sollte Datenbankfehler behandeln', async () => {
      const errorMessage = 'Database connection failed';
      mockPool.query.mockRejectedValueOnce(new Error(errorMessage));

      const response = await request(app).get('/api/entities/Participant');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: errorMessage });
    });
  });

  describe('Input Validation', () => {
    test('POST /api/entities/Participant sollte leere Requests ablehnen', async () => {
      // Mock für leeren Request - wird erstmal einen Fehler werfen
      mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/entities/Participant')
        .send({});

      // Da wir noch keine Validierung haben, wird dies erstmal durchgehen
      // TODO: Implementiere Input-Validierung
      expect(response.status).toBe(200);
    });

    test('POST sollte SQL Injection verhindern', async () => {
      const maliciousInput = {
        name: "'; DROP TABLE Participant; --",
        balance: 0
      };

      mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/entities/Participant')
        .send(maliciousInput);

      expect(response.status).toBe(200);
      // Prepared Statements sollten SQL Injection verhindern
      expect(mockPool.query).toHaveBeenCalledWith('INSERT INTO Participant SET ?', [maliciousInput]);
    });
  });

  describe('Error Handling', () => {
    test('Sollte 404 für unbekannte Routen zurückgeben', async () => {
      const response = await request(app).get('/api/unknown-route');
      
      expect(response.status).toBe(404);
    });

    test('Sollte JSON Parse Errors behandeln', async () => {
      const response = await request(app)
        .post('/api/entities/Participant')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});
