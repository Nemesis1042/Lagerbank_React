import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash ein Passwort mit bcrypt
 * @param {string} password - Das zu hashende Passwort
 * @returns {Promise<string>} - Das gehashte Passwort
 */
export async function hashPassword(password) {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.error('Fehler beim Hashen des Passworts:', error);
    throw new Error('Passwort konnte nicht gehasht werden');
  }
}

/**
 * Vergleiche ein Klartext-Passwort mit einem gehashten Passwort
 * @param {string} password - Das Klartext-Passwort
 * @param {string} hashedPassword - Das gehashte Passwort
 * @returns {Promise<boolean>} - True wenn die Passwörter übereinstimmen
 */
export async function comparePassword(password, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Fehler beim Vergleichen der Passwörter:', error);
    throw new Error('Passwort konnte nicht verifiziert werden');
  }
}

/**
 * Prüfe ob ein String bereits ein bcrypt Hash ist
 * @param {string} str - Der zu prüfende String
 * @returns {boolean} - True wenn es ein bcrypt Hash ist
 */
export function isBcryptHash(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  // bcrypt Hashes beginnen mit $2a$, $2b$, $2x$ oder $2y$
  const bcryptRegex = /^\$2[abxy]\$\d{2}\$.{53}$/;
  return bcryptRegex.test(str);
}

/**
 * Generiere ein sicheres zufälliges Passwort
 * @param {number} length - Länge des Passworts (Standard: 16)
 * @returns {string} - Das generierte Passwort
 */
export function generateSecurePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Validiere Passwort-Stärke
 * @param {string} password - Das zu validierende Passwort
 * @returns {Object} - Validierungsergebnis mit isValid und Fehlermeldungen
 */
export function validatePasswordStrength(password) {
  const result = {
    isValid: true,
    errors: [],
    score: 0
  };

  if (!password || typeof password !== 'string') {
    result.isValid = false;
    result.errors.push('Passwort ist erforderlich');
    return result;
  }

  // Mindestlänge
  if (password.length < 8) {
    result.isValid = false;
    result.errors.push('Passwort muss mindestens 8 Zeichen lang sein');
  } else {
    result.score += 1;
  }

  // Großbuchstaben
  if (!/[A-Z]/.test(password)) {
    result.errors.push('Passwort sollte mindestens einen Großbuchstaben enthalten');
  } else {
    result.score += 1;
  }

  // Kleinbuchstaben
  if (!/[a-z]/.test(password)) {
    result.errors.push('Passwort sollte mindestens einen Kleinbuchstaben enthalten');
  } else {
    result.score += 1;
  }

  // Zahlen
  if (!/\d/.test(password)) {
    result.errors.push('Passwort sollte mindestens eine Zahl enthalten');
  } else {
    result.score += 1;
  }

  // Sonderzeichen
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.errors.push('Passwort sollte mindestens ein Sonderzeichen enthalten');
  } else {
    result.score += 1;
  }

  // Länge Bonus
  if (password.length >= 12) {
    result.score += 1;
  }

  return result;
}
