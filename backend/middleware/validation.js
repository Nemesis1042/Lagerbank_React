import Joi from 'joi';

/**
 * Validation Schemas für verschiedene Entitäten
 */

// Participant Schema
export const participantSchema = Joi.object({
  tn_id: Joi.number().integer().min(1).optional().allow(null),
  name: Joi.string().min(1).max(100).required().trim(),
  barcode_id: Joi.string().max(100).optional().allow(null, ''),
  balance: Joi.number().precision(2).default(0),
  initial_balance: Joi.number().precision(2).default(0),
  is_staff: Joi.boolean().default(false),
  is_checked_in: Joi.boolean().default(false),
  camp_id: Joi.number().integer().min(1).optional().allow(null),
  camp_name: Joi.string().max(100).optional().allow(null, '')
});

// Product Schema
export const productSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().trim(),
  price: Joi.number().precision(2).min(0).required(),
  icon: Joi.string().max(50).optional().allow(null, ''),
  stock: Joi.number().integer().min(0).default(0),
  barcode: Joi.string().max(100).optional().allow(null, '')
});

// Transaction Schema
export const transactionSchema = Joi.object({
  participant_id: Joi.number().integer().min(1).required(),
  product_id: Joi.number().integer().min(1).required(),
  camp_id: Joi.number().integer().min(1).optional().allow(null),
  quantity: Joi.number().integer().min(1).required(),
  total_price: Joi.number().precision(2).required(),
  participant_name: Joi.string().max(100).optional().allow(null, ''),
  product_name: Joi.string().max(100).optional().allow(null, ''),
  camp_name: Joi.string().max(100).optional().allow(null, ''),
  is_storno: Joi.boolean().default(false),
  is_cancelled: Joi.boolean().default(false),
  original_transaction_id: Joi.number().integer().min(1).optional().allow(null)
});

// Camp Schema
export const campSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().trim(),
  start_date: Joi.date().optional().allow(null),
  end_date: Joi.date().optional().allow(null),
  location: Joi.string().max(200).optional().allow(null, ''),
  is_active: Joi.boolean().default(false),
  year: Joi.number().integer().min(2000).max(2100).optional().allow(null),
  description: Joi.string().optional().allow(null, ''),
  require_positive_balance: Joi.boolean().default(false)
});

// AppSettings Schema
export const appSettingsSchema = Joi.object({
  camp_name: Joi.string().max(100).optional().allow(null, ''),
  currency_symbol: Joi.string().max(10).optional().allow(null, ''),
  admin_password: Joi.string().min(8).max(255).optional(),
  active_camp_id: Joi.number().integer().min(1).optional().allow(null),
  active_camp_name: Joi.string().max(100).optional().allow(null, '')
});

// AuditLog Schema
export const auditLogSchema = Joi.object({
  action: Joi.string().min(1).max(100).required(),
  entity_type: Joi.string().max(50).optional().allow(null, ''),
  entity_id: Joi.string().max(50).optional().allow(null, ''),
  details: Joi.string().optional().allow(null, ''),
  authid: Joi.string().max(100).optional().allow(null, ''),
  camp_id: Joi.number().integer().min(1).optional().allow(null),
  ip_address: Joi.string().max(50).optional().allow(null, ''),
  user_agent: Joi.string().max(200).optional().allow(null, '')
});

// Auth Schema
export const loginSchema = Joi.object({
  password: Joi.string().min(1).required(),
  username: Joi.string().max(50).optional().default('admin')
});

/**
 * Middleware-Funktion zur Validierung von Request Bodies
 * @param {Joi.Schema} schema - Das Joi-Schema zur Validierung
 * @returns {Function} - Express Middleware-Funktion
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Alle Fehler sammeln
      stripUnknown: true, // Unbekannte Felder entfernen
      convert: true // Automatische Typkonvertierung
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log(`[${new Date().toISOString()}] Validation error:`, errorDetails);

      return res.status(400).json({
        error: 'Validierungsfehler',
        details: errorDetails
      });
    }

    // Validierte und bereinigte Daten zurück in req.body
    req.body = value;
    next();
  };
}

/**
 * Middleware zur Validierung von Query-Parametern
 * @param {Joi.Schema} schema - Das Joi-Schema zur Validierung
 * @returns {Function} - Express Middleware-Funktion
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log(`[${new Date().toISOString()}] Query validation error:`, errorDetails);

      return res.status(400).json({
        error: 'Query-Parameter Validierungsfehler',
        details: errorDetails
      });
    }

    req.query = value;
    next();
  };
}

/**
 * Middleware zur Validierung von URL-Parametern
 * @param {Joi.Schema} schema - Das Joi-Schema zur Validierung
 * @returns {Function} - Express Middleware-Funktion
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log(`[${new Date().toISOString()}] Params validation error:`, errorDetails);

      return res.status(400).json({
        error: 'URL-Parameter Validierungsfehler',
        details: errorDetails
      });
    }

    req.params = value;
    next();
  };
}

// Common Query Schemas
export const idParamSchema = Joi.object({
  id: Joi.number().integer().min(1).required()
});

export const participantQuerySchema = Joi.object({
  camp_id: Joi.number().integer().min(1).optional(),
  is_staff: Joi.string().valid('true', 'false').optional(),
  is_checked_in: Joi.string().valid('true', 'false').optional()
});

export const transactionQuerySchema = Joi.object({
  participant_id: Joi.number().integer().min(1).optional(),
  camp_id: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional()
});

/**
 * Sanitize HTML-Input um XSS zu verhindern
 * @param {string} input - Der zu bereinigende Input
 * @returns {string} - Der bereinigte Input
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Middleware zur HTML-Sanitization aller String-Felder
 */
export function sanitizeInput(req, res, next) {
  function sanitizeObject(obj) {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeHtml(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    }
  }

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);

  next();
}
