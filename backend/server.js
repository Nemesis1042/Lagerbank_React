import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { extractUserInfo, createSession, validateSession, destroySession, getActiveSessions } from "./middleware/auth.js";
import Joi from "joi";
import { 
  validateBody, 
  validateQuery, 
  validateParams, 
  sanitizeInput,
  participantSchema,
  productSchema,
  transactionSchema,
  campSchema,
  appSettingsSchema,
  auditLogSchema,
  loginSchema,
  idParamSchema,
  participantQuerySchema,
  transactionQuerySchema
} from "./middleware/validation.js";
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  healthCheck, 
  asyncHandler,
  handleDatabaseError
} from "./middleware/errorHandler.js";
import { comparePassword, hashPassword, isBcryptHash } from "./utils/passwordUtils.js";

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Zu viele Anfragen von dieser IP, versuchen Sie es später erneut.',
    statusCode: 429
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Zu viele Login-Versuche, versuchen Sie es später erneut.',
    statusCode: 429
  }
});

const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 bulk operations per hour
  message: {
    error: 'Zu viele Bulk-Operationen, versuchen Sie es später erneut.',
    statusCode: 429
  }
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/entities/*/bulk', bulkLimiter);

// Request logging and user info extraction
app.use(requestLogger);
app.use(extractUserInfo);
app.use(sanitizeInput);

// Datenbankverbindung
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lagerbank",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Health Check Endpoint
app.get("/health", healthCheck);

// ==================== Participant ====================
app.get("/api/entities/Participant", 
  validateQuery(participantQuerySchema),
  asyncHandler(async (req, res) => {
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
  })
);

app.post("/api/entities/Participant", 
  validateBody(participantSchema),
  asyncHandler(async (req, res) => {
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
  })
);

app.put("/api/entities/Participant/:id", 
  validateParams(idParamSchema),
  validateBody(participantSchema.fork(['name'], (schema) => schema.optional())),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    console.log(`[${new Date().toISOString()}] Executing query: UPDATE Participant SET ? WHERE id = ?`, [data, id]);
    const [result] = await pool.query("UPDATE Participant SET ? WHERE id = ?", [
      data,
      id,
    ]);
    console.log(`[${new Date().toISOString()}] Update result: ${result.affectedRows} rows affected`);
    res.json({ updated: result.affectedRows });
  })
);

app.delete("/api/entities/Participant/:id", 
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // check if participant is referenced
    const [tx] = await pool.query("SELECT COUNT(*) as cnt FROM Transaction WHERE participant_id = ?", [id]);
    if (tx[0].cnt > 0) {
      return res.status(400).json({
        error: "Teilnehmer kann nicht gelöscht werden, es existieren noch Transaktionen."
      });
    }

    const [result] = await pool.query("DELETE FROM Participant WHERE id = ?", [id]);
    res.json({ deleted: result.affectedRows });
  })
);


app.post("/api/entities/Participant/bulk", 
  validateBody(Joi.array().items(participantSchema).min(1).max(100)),
  asyncHandler(async (req, res) => {
    const participants = req.body;
    console.log(`[${new Date().toISOString()}] Executing bulk insert for ${participants.length} participants`);
    
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
  })
);

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

    // Handle ordering - check for URL parameters that start with '-' for descending order
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const allParams = Array.from(urlParams.keys());
    const orderParam = allParams.find(param => param.startsWith('-'));
    
    if (orderParam) {
      const field = orderParam.substring(1); // Remove the '-' prefix
      query += ` ORDER BY ${field} DESC`;
      console.log(`[${new Date().toISOString()}] Added ordering: ${field} DESC`);
    }

    // Handle limit parameter (third parameter in filter calls)
    const limitParam = allParams.find(param => !isNaN(parseInt(param)) && param !== req.query.participant_id && param !== req.query.camp_id);
    if (limitParam) {
      query += ` LIMIT ${parseInt(limitParam)}`;
      console.log(`[${new Date().toISOString()}] Added limit: ${limitParam}`);
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
  const { id } = req.params;
  const { force } = req.query; // Check if force deletion is requested
  
  try {
    console.log(`[${new Date().toISOString()}] Checking references for Camp ID: ${id}, force: ${force}`);
    
    const warnings = [];
    
    // Check if camp is referenced in Transaction table
    const [transactions] = await pool.query("SELECT COUNT(*) as cnt FROM Transaction WHERE camp_id = ?", [id]);
    if (transactions[0].cnt > 0) {
      console.log(`[${new Date().toISOString()}] Camp ${id} has ${transactions[0].cnt} transactions`);
      warnings.push(`${transactions[0].cnt} Transaktionen werden mit gelöscht`);
    }

    // Check if camp is referenced in Participant table
    const [participants] = await pool.query("SELECT COUNT(*) as cnt FROM Participant WHERE camp_id = ?", [id]);
    if (participants[0].cnt > 0) {
      console.log(`[${new Date().toISOString()}] Camp ${id} has ${participants[0].cnt} participants`);
      warnings.push(`${participants[0].cnt} Teilnehmer werden mit gelöscht`);
    }

    // Check if camp is set as active camp in AppSettings
    const [settings] = await pool.query("SELECT COUNT(*) as cnt FROM AppSettings WHERE active_camp_id = ?", [id]);
    if (settings[0].cnt > 0) {
      console.log(`[${new Date().toISOString()}] Camp ${id} is currently active`);
      warnings.push("Das aktive Lager wird zurückgesetzt");
    }

    // Check if camp is referenced in AuditLog table
    const [auditLogs] = await pool.query("SELECT COUNT(*) as cnt FROM AuditLog WHERE camp_id = ?", [id]);
    if (auditLogs[0].cnt > 0) {
      console.log(`[${new Date().toISOString()}] Camp ${id} has ${auditLogs[0].cnt} audit log entries`);
      warnings.push(`${auditLogs[0].cnt} Audit-Log-Einträge werden mit gelöscht`);
    }

    // If there are warnings and force is not set, return warnings
    if (warnings.length > 0 && force !== 'true') {
      console.log(`[${new Date().toISOString()}] Returning warnings for Camp ${id}:`, warnings);
      return res.status(409).json({
        requiresConfirmation: true,
        warnings: warnings,
        message: "Dieses Lager hat noch verknüpfte Daten. Möchten Sie es trotzdem löschen?"
      });
    }

    // Proceed with deletion (cascade delete)
    console.log(`[${new Date().toISOString()}] Proceeding with deletion of Camp ${id} and all related data`);
    
    // Delete in correct order to avoid foreign key constraints
    // First, remove foreign key references
    await pool.query("UPDATE AppSettings SET active_camp_id = NULL, active_camp_name = NULL WHERE active_camp_id = ?", [id]);
    
    // Then delete dependent records
    await pool.query("DELETE FROM Transaction WHERE camp_id = ?", [id]);
    await pool.query("DELETE FROM Participant WHERE camp_id = ?", [id]);
    await pool.query("DELETE FROM AuditLog WHERE camp_id = ?", [id]);
    
    // Finally delete the camp itself
    const [result] = await pool.query("DELETE FROM Camp WHERE id = ?", [id]);
    console.log(`[${new Date().toISOString()}] Delete result: ${result.affectedRows} rows affected`);
    
    res.json({ 
      deleted: result.affectedRows,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database error in Camp DELETE:`, error);
    res.status(500).json({ error: "Serverfehler beim Löschen des Lagers" });
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
    
    // Automatically add authid and other user info if not provided
    const auditData = {
      ...data,
      authid: data.authid || req.userInfo.authid,
      ip_address: data.ip_address || req.userInfo.ipAddress,
      user_agent: data.user_agent || req.userInfo.userAgent
    };
    
    console.log(`[${new Date().toISOString()}] Executing query: INSERT INTO AuditLog SET ?`, [auditData]);
    const [result] = await pool.query("INSERT INTO AuditLog SET ?", [auditData]);
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

// ==================== Authentication Routes ====================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { password, username } = req.body;
    
    // Get admin password from database
    const [settings] = await pool.query("SELECT admin_password FROM AppSettings LIMIT 1");
    const adminPassword = settings.length > 0 ? settings[0].admin_password : 'admin';
    
    if (password === adminPassword) {
      // Create session
      const authid = username || 'admin';
      const sessionToken = createSession(authid, 'admin');
      
      // Log the login
      const auditData = {
        action: 'admin_login',
        entity_type: 'System',
        entity_id: null,
        details: JSON.stringify({ username: authid }),
        authid: authid,
        camp_id: null,
        ip_address: req.userInfo.ipAddress,
        user_agent: req.userInfo.userAgent
      };
      
      try {
        await pool.query("INSERT INTO AuditLog SET ?", [auditData]);
      } catch (auditError) {
        console.error('Failed to log admin login:', auditError);
      }
      
      res.json({ 
        success: true, 
        sessionToken,
        authid,
        userType: 'admin'
      });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    const sessionToken = req.userInfo.sessionToken;
    
    if (sessionToken) {
      // Log the logout
      const auditData = {
        action: 'admin_logout',
        entity_type: 'System',
        entity_id: null,
        details: JSON.stringify({ authid: req.userInfo.authid }),
        authid: req.userInfo.authid,
        camp_id: null,
        ip_address: req.userInfo.ipAddress,
        user_agent: req.userInfo.userAgent
      };
      
      pool.query("INSERT INTO AuditLog SET ?", [auditData]).catch(auditError => {
        console.error('Failed to log admin logout:', auditError);
      });
      
      destroySession(sessionToken);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

app.get("/api/auth/session", (req, res) => {
  res.json({
    authid: req.userInfo.authid,
    userType: req.userInfo.userType,
    isAuthenticated: req.userInfo.userType !== 'anonymous'
  });
});

app.get("/api/auth/sessions", (req, res) => {
  // Debug endpoint to see active sessions
  res.json(getActiveSessions());
});

//=====================TEST ROUTE=========================
// Test-Route für root
app.get("/", (req, res) => {
  res.send("Backend läuft 🚀");
});

// ==================== Error Handling ====================
// 404 Handler für unbekannte Routen
app.use(notFoundHandler);

// Zentraler Error Handler (muss als letztes stehen)
app.use(errorHandler);

// ==================== Server starten ====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Backend läuft auf http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`);
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`[${new Date().toISOString()}] SIGINT received, shutting down gracefully`);
  await pool.end();
  process.exit(0);
});
