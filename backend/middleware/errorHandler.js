/**
 * Zentraler Error Handler für die Lagerbank API
 */

/**
 * Custom Error Klassen
 */
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentifizierung fehlgeschlagen') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Nicht autorisiert') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Ressource nicht gefunden') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Konflikt mit vorhandenen Daten') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Datenbankfehler', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

/**
 * Async Error Handler Wrapper
 * Fängt Fehler in async Route Handlers ab
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Handler für unbekannte Routen
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.originalUrl} nicht gefunden`);
  next(error);
}

/**
 * Zentraler Error Handler Middleware
 */
export function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Interner Serverfehler';
  let details = error.details || null;

  // Log Error Details
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    authid: req.userInfo?.authid || 'anonymous',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  };

  // Verschiedene Error-Typen behandeln
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validierungsfehler';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Ungültiger Parameter';
  } else if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Datensatz bereits vorhanden';
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenzierter Datensatz nicht gefunden';
  } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 409;
    message = 'Datensatz wird noch verwendet und kann nicht gelöscht werden';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Datenbankverbindung fehlgeschlagen';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Ungültiges JSON Format';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request zu groß';
  }

  // Log Level basierend auf Status Code
  if (statusCode >= 500) {
    console.error(`[${errorLog.timestamp}] ERROR:`, errorLog);
  } else if (statusCode >= 400) {
    console.warn(`[${errorLog.timestamp}] WARNING:`, errorLog);
  }

  // Response Format
  const errorResponse = {
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  // Details nur in Development Mode oder bei Validierungsfehlern
  if (process.env.NODE_ENV === 'development' || error.name === 'ValidationError') {
    if (details) {
      errorResponse.details = details;
    }
    if (error.stack) {
      errorResponse.stack = error.stack;
    }
  }

  // Request ID für Tracking (falls vorhanden)
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Database Error Handler
 * Konvertiert MySQL Fehler in benutzerfreundliche Nachrichten
 */
export function handleDatabaseError(error, context = '') {
  console.error(`[${new Date().toISOString()}] Database Error in ${context}:`, error);

  // MySQL spezifische Fehler
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      throw new ConflictError('Ein Datensatz mit diesen Daten existiert bereits');
    
    case 'ER_NO_REFERENCED_ROW_2':
      throw new ValidationError('Referenzierter Datensatz nicht gefunden');
    
    case 'ER_ROW_IS_REFERENCED_2':
      throw new ConflictError('Datensatz kann nicht gelöscht werden, da er noch verwendet wird');
    
    case 'ER_BAD_FIELD_ERROR':
      throw new ValidationError('Ungültiges Feld in der Anfrage');
    
    case 'ER_NO_SUCH_TABLE':
      throw new DatabaseError('Tabelle nicht gefunden');
    
    case 'ER_ACCESS_DENIED_ERROR':
      throw new DatabaseError('Datenbankzugriff verweigert');
    
    case 'ECONNREFUSED':
      throw new DatabaseError('Datenbankverbindung fehlgeschlagen');
    
    case 'ETIMEDOUT':
      throw new DatabaseError('Datenbankverbindung timeout');
    
    default:
      throw new DatabaseError('Unbekannter Datenbankfehler', error);
  }
}

/**
 * Request Logger Middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Response Ende abfangen
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      authid: req.userInfo?.authid || 'anonymous'
    };

    // Log Level basierend auf Status Code
    if (res.statusCode >= 500) {
      console.error(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.statusCode} - ${logData.duration}`);
    } else if (res.statusCode >= 400) {
      console.warn(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.statusCode} - ${logData.duration}`);
    } else {
      console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.statusCode} - ${logData.duration}`);
    }

    originalSend.call(this, data);
  };

  next();
}

/**
 * Health Check Endpoint
 */
export function healthCheck(req, res) {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(healthData);
}
