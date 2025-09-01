import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Debug middleware for logging requests
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request received`);

  // Log request body for POST/PUT requests (excluding sensitive data)
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[${new Date().toISOString()}] Request body:`, JSON.stringify(req.body, null, 2));
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Response sent (${res.statusCode}) in ${duration}ms`);
    console.log(`[${new Date().toISOString()}] Response data:`, JSON.stringify(data, null, 2));
    return originalJson.call(this, data);
  };

  next();
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==================== Participant ====================
app.get("/api/entities/Participant", async (req, res) => {
  try {
    let query = "SELECT * FROM Participant WHERE 1=1";
    const params = [];

    // Filter by camp_id if provided
    if (req.query.camp_id) {
      query += " AND camp_id = ?";
      params.push(req.query.camp_id);
    }

    // Filter by is_staff if provided
    if (req.query.is_staff !== undefined) {
      query += " AND is_staff = ?";
      params.push(req.query.is_staff === 'true' ? 1 : 0);
    }

    // Filter by is_checked_in if provided
    if (req.query.is_checked_in !== undefined) {
      query += " AND is_checked_in = ?";
      params.push(req.query.is_checked_in === 'true' ? 1 : 0);
    }

    console.log(`[${new Date().toISOString()}] Executing query: ${query}`, params);
    const [rows] = await pool.query(query, params);
    
    // Convert numeric fields from strings to numbers
    const processedRows = rows.map(row => ({
      ...row,
      balance: parseFloat(row.balance) || 0,
      initial_balance: parseFloat(row.initial_balance) || 0,
      tn_id: row.tn_id ? parseInt(row.tn_id) : null,
      is_staff: Boolean(row.is_staff),
      is_checked_in: Boolean(row.is_checked_in)
    }));
    
    console.log(`[${new Date().toISOString()}] Query result: ${processedRows.length} rows returned`);
    res.json(processedRows);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Participant GET:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post("/api/entities/Participant", async (req, res) => {
  try {
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: INSERT INTO Participant SET ?`, [data]);
    const [result] = await pool.query("INSERT INTO Participant SET ?", [data]);
    console.log(`[${new Date().toISOString()}] Insert result: ID ${result.insertId} created`);
    
    // Return the created participant with proper data types
    const createdParticipant = {
      id: result.insertId,
      ...data,
      balance: parseFloat(data.balance) || 0,
      initial_balance: parseFloat(data.initial_balance) || 0,
      tn_id: data.tn_id ? parseInt(data.tn_id) : null,
      is_staff: Boolean(data.is_staff),
      is_checked_in: Boolean(data.is_checked_in)
    };
    
    res.json(createdParticipant);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Participant POST:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.put("/api/entities/Participant/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: UPDATE Participant SET ? WHERE id = ?`, [data, id]);
    const [result] = await pool.query("UPDATE Participant SET ? WHERE id = ?", [
      data,
      id,
    ]);
    console.log(`[${new Date().toISOString()}] Update result: ${result.affectedRows} rows affected`);
    res.json({ updated: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Participant PUT:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.delete("/api/entities/Participant/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Executing query: DELETE FROM Participant WHERE id = ?`, [id]);
    const [result] = await pool.query("DELETE FROM Participant WHERE id = ?", [id]);
    console.log(`[${new Date().toISOString()}] Delete result: ${result.affectedRows} rows affected`);
    res.json({ deleted: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Participant DELETE:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post("/api/entities/Participant/bulk", async (req, res) => {
  try {
    const participants = req.body;
    console.log(`[${new Date().toISOString()}] Executing bulk insert for ${participants.length} participants`);
    
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array of participants" });
    }

    const results = [];
    
    // Insert each participant individually to get proper IDs and error handling
    for (const participant of participants) {
      try {
        const [result] = await pool.query("INSERT INTO Participant SET ?", [participant]);
        
        // Return properly formatted participant data
        const createdParticipant = {
          id: result.insertId,
          ...participant,
          balance: parseFloat(participant.balance) || 0,
          initial_balance: parseFloat(participant.initial_balance) || 0,
          tn_id: participant.tn_id ? parseInt(participant.tn_id) : null,
          is_staff: Boolean(participant.is_staff),
          is_checked_in: Boolean(participant.is_checked_in)
        };
        
        results.push(createdParticipant);
        console.log(`[${new Date().toISOString()}] Bulk insert: Created participant ${participant.name} with ID ${result.insertId}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error inserting participant ${participant.name}:`, error);
        // Continue with other participants, but log the error
      }
    }
    
    console.log(`[${new Date().toISOString()}] Bulk insert completed: ${results.length}/${participants.length} participants created`);
    res.json(results);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Participant bulk POST:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== Product ====================
app.get("/api/entities/Product", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Executing query: SELECT * FROM Product`);
    const [rows] = await pool.query("SELECT * FROM Product");
    
    // Convert numeric fields from strings to numbers
    const processedRows = rows.map(row => ({
      ...row,
      price: parseFloat(row.price) || 0,
      stock: parseInt(row.stock) || 0
    }));
    
    console.log(`[${new Date().toISOString()}] Query result: ${processedRows.length} rows returned`);
    res.json(processedRows);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Product GET:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post("/api/entities/Product", async (req, res) => {
  try {
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: INSERT INTO Product SET ?`, [data]);
    const [result] = await pool.query("INSERT INTO Product SET ?", [data]);
    console.log(`[${new Date().toISOString()}] Insert result: ID ${result.insertId} created`);
    res.json({ id: result.insertId, created: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Product POST:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.put("/api/entities/Product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: UPDATE Product SET ? WHERE id = ?`, [data, id]);
    const [result] = await pool.query("UPDATE Product SET ? WHERE id = ?", [
      data,
      id,
    ]);
    console.log(`[${new Date().toISOString()}] Update result: ${result.affectedRows} rows affected`);
    res.json({ updated: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Product PUT:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.delete("/api/entities/Product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Executing query: DELETE FROM Product WHERE id = ?`, [id]);
    const [result] = await pool.query("DELETE FROM Product WHERE id = ?", [id]);
    console.log(`[${new Date().toISOString()}] Delete result: ${result.affectedRows} rows affected`);
    res.json({ deleted: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Product DELETE:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== Transaction ====================
app.get("/api/entities/Transaction", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Transaction GET - Query params:`, req.query);
    
    let query = "SELECT * FROM Transaction WHERE 1=1";
    const params = [];

    // Filter by participant_id if provided
    if (req.query.participant_id) {
      query += " AND participant_id = ?";
      params.push(req.query.participant_id);
      console.log(`[${new Date().toISOString()}] Added participant_id filter: ${req.query.participant_id}`);
    }

    // Filter by camp_id if provided
    if (req.query.camp_id) {
      query += " AND camp_id = ?";
      params.push(req.query.camp_id);
      console.log(`[${new Date().toISOString()}] Added camp_id filter: ${req.query.camp_id}`);
    }

    console.log(`[${new Date().toISOString()}] Final query: ${query}`);
    console.log(`[${new Date().toISOString()}] Query params:`, params);
    
    const [rows] = await pool.query(query, params);
    console.log(`[${new Date().toISOString()}] Query result: ${rows.length} rows returned`);
    res.json(rows);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Transaction GET:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post("/api/entities/Transaction", async (req, res) => {
  try {
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: INSERT INTO Transaction SET ?`, [data]);
    const [result] = await pool.query("INSERT INTO Transaction SET ?", [data]);
    console.log(`[${new Date().toISOString()}] Insert result: ID ${result.insertId} created`);
    res.json({ id: result.insertId, created: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Transaction POST:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.put("/api/entities/Transaction/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: UPDATE Transaction SET ? WHERE id = ?`, [data, id]);
    const [result] = await pool.query("UPDATE Transaction SET ? WHERE id = ?", [
      data,
      id,
    ]);
    console.log(`[${new Date().toISOString()}] Update result: ${result.affectedRows} rows affected`);
    res.json({ updated: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Transaction PUT:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== Camp ====================
app.get("/api/entities/Camp", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Executing query: SELECT * FROM Camp`);
    const [rows] = await pool.query("SELECT * FROM Camp");
    console.log(`[${new Date().toISOString()}] Query result: ${rows.length} rows returned`);
    res.json(rows);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Camp GET:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post("/api/entities/Camp", async (req, res) => {
  try {
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: INSERT INTO Camp SET ?`, [data]);
    const [result] = await pool.query("INSERT INTO Camp SET ?", [data]);
    console.log(`[${new Date().toISOString()}] Insert result: ID ${result.insertId} created`);
    res.json({ id: result.insertId, created: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Camp POST:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.put("/api/entities/Camp/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: UPDATE Camp SET ? WHERE id = ?`, [data, id]);
    const [result] = await pool.query("UPDATE Camp SET ? WHERE id = ?", [
      data,
      id,
    ]);
    console.log(`[${new Date().toISOString()}] Update result: ${result.affectedRows} rows affected`);
    res.json({ updated: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Camp PUT:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.delete("/api/entities/Camp/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Executing query: DELETE FROM Camp WHERE id = ?`, [id]);
    const [result] = await pool.query("DELETE FROM Camp WHERE id = ?", [id]);
    console.log(`[${new Date().toISOString()}] Delete result: ${result.affectedRows} rows affected`);
    res.json({ deleted: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Camp DELETE:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== AppSettings ====================
app.get("/api/entities/AppSettings", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Executing query: SELECT * FROM AppSettings`);
    const [rows] = await pool.query("SELECT * FROM AppSettings");
    console.log(`[${new Date().toISOString()}] Query result: ${rows.length} rows returned`);
    res.json(rows);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in AppSettings GET:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post("/api/entities/AppSettings", async (req, res) => {
  try {
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: INSERT INTO AppSettings SET ?`, [data]);
    const [result] = await pool.query("INSERT INTO AppSettings SET ?", [data]);
    console.log(`[${new Date().toISOString()}] Insert result: ID ${result.insertId} created`);
    res.json({ id: result.insertId, created: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in AppSettings POST:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.put("/api/entities/AppSettings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: UPDATE AppSettings SET ? WHERE id = ?`, [data, id]);
    const [result] = await pool.query("UPDATE AppSettings SET ? WHERE id = ?", [
      data,
      id,
    ]);
    console.log(`[${new Date().toISOString()}] Update result: ${result.affectedRows} rows affected`);
    res.json({ updated: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in AppSettings PUT:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== AuditLog ====================
app.get("/api/entities/AuditLog", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Executing query: SELECT * FROM AuditLog`);
    const [rows] = await pool.query("SELECT * FROM AuditLog");
    console.log(`[${new Date().toISOString()}] Query result: ${rows.length} rows returned`);
    res.json(rows);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in AuditLog GET:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post("/api/entities/AuditLog", async (req, res) => {
  try {
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: INSERT INTO AuditLog SET ?`, [data]);
    const [result] = await pool.query("INSERT INTO AuditLog SET ?", [data]);
    console.log(`[${new Date().toISOString()}] Insert result: ID ${result.insertId} created`);
    res.json({ id: result.insertId, created: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in AuditLog POST:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.put("/api/entities/AuditLog/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: UPDATE AuditLog SET ? WHERE id = ?`, [data, id]);
    const [result] = await pool.query("UPDATE AuditLog SET ? WHERE id = ?", [
      data,
      id,
    ]);
    console.log(`[${new Date().toISOString()}] Update result: ${result.affectedRows} rows affected`);
    res.json({ updated: result.affectedRows });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in AuditLog PUT:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

//=====================TEST ROUTE=========================
// Test-Route für root
app.get("/", (req, res) => {
  res.send("Backend läuft 🚀");
});

// ==================== Server starten ====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});
