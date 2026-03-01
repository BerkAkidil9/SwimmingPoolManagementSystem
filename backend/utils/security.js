const crypto = require("crypto");

/**
 * Escapes HTML special characters to prevent XSS/HTML injection
 * when interpolating user-supplied values into HTML email templates.
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Hashes a token (reset, verification) with SHA-256 before storing in DB.
 * The raw token is sent to the user; the hash is stored in the database.
 * On verification, the incoming token is hashed and compared against the DB value.
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Validates password strength.
 * Returns { valid: true } or { valid: false, error: "..." }
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password must be at most 128 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}

module.exports = { escapeHtml, hashToken, validatePasswordStrength };
