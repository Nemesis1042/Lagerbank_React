import crypto from 'crypto';

// Simple in-memory session store
// In production, you might want to use Redis or a database
const sessions = new Map();

// Generate a unique session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to extract user information from request
export function extractUserInfo(req, res, next) {
  // Check for session token in headers
  const sessionToken = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');
  
  let authid = 'anonymous';
  let userType = 'anonymous';
  
  if (sessionToken && sessions.has(sessionToken)) {
    const session = sessions.get(sessionToken);
    authid = session.authid;
    userType = session.userType;
    
    // Update last activity
    session.lastActivity = new Date();
  }
  
  // Add user info to request object
  req.userInfo = {
    authid,
    userType,
    sessionToken,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown'
  };
  
  next();
}

// Create a new session
export function createSession(authid, userType = 'admin') {
  const sessionToken = generateSessionId();
  const session = {
    authid,
    userType,
    createdAt: new Date(),
    lastActivity: new Date()
  };
  
  sessions.set(sessionToken, session);
  
  // Clean up old sessions (older than 24 hours)
  cleanupOldSessions();
  
  return sessionToken;
}

// Validate session
export function validateSession(sessionToken) {
  if (!sessionToken || !sessions.has(sessionToken)) {
    return null;
  }
  
  const session = sessions.get(sessionToken);
  
  // Check if session is expired (24 hours)
  const now = new Date();
  const sessionAge = now - session.lastActivity;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  if (sessionAge > maxAge) {
    sessions.delete(sessionToken);
    return null;
  }
  
  // Update last activity
  session.lastActivity = now;
  
  return session;
}

// Destroy session
export function destroySession(sessionToken) {
  if (sessionToken && sessions.has(sessionToken)) {
    sessions.delete(sessionToken);
    return true;
  }
  return false;
}

// Clean up old sessions
function cleanupOldSessions() {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [token, session] of sessions.entries()) {
    const sessionAge = now - session.lastActivity;
    if (sessionAge > maxAge) {
      sessions.delete(token);
    }
  }
}

// Get all active sessions (for debugging)
export function getActiveSessions() {
  return Array.from(sessions.entries()).map(([token, session]) => ({
    token: token.substring(0, 8) + '...', // Only show first 8 chars for security
    authid: session.authid,
    userType: session.userType,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity
  }));
}

// Middleware to require authentication
export function requireAuth(req, res, next) {
  if (req.userInfo.userType === 'anonymous') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
