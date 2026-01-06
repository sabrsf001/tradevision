/**
 * Security Service - TradeVision
 * Enterprise-grade encryption for API keys and sensitive data
 * Uses WebCrypto API for client-side encryption
 */

// ============================================
// Types
// ============================================
export interface EncryptedData {
  iv: string;
  data: string;
  salt: string;
  version: number;
}

export interface SecureCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For exchanges like Coinbase
}

export interface SecureExchangeConnection {
  exchangeId: string;
  encryptedCredentials: EncryptedData;
  createdAt: number;
  lastUsed: number;
  permissions: ('read' | 'trade' | 'withdraw')[];
}

// ============================================
// Constants
// ============================================
const ENCRYPTION_VERSION = 1;
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ITERATION_COUNT = 100000;
const STORAGE_KEY = 'tv_secure_exchanges';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// ============================================
// Crypto Utilities
// ============================================

/**
 * Generate a cryptographically secure random buffer
 */
function generateRandomBuffer(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive encryption key from master password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATION_COUNT,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ============================================
// Encryption/Decryption
// ============================================

/**
 * Encrypt sensitive data
 */
export async function encryptData(
  data: string,
  masterPassword: string
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const salt = generateRandomBuffer(SALT_LENGTH);
  const iv = generateRandomBuffer(IV_LENGTH);
  
  const key = await deriveKey(masterPassword, salt);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(data)
  );
  
  return {
    iv: bufferToBase64(iv),
    data: bufferToBase64(encryptedBuffer),
    salt: bufferToBase64(salt),
    version: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypt sensitive data
 */
export async function decryptData(
  encrypted: EncryptedData,
  masterPassword: string
): Promise<string> {
  const iv = base64ToBuffer(encrypted.iv);
  const salt = base64ToBuffer(encrypted.salt);
  const data = base64ToBuffer(encrypted.data);
  
  const key = await deriveKey(masterPassword, salt);
  
  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      data.buffer as ArrayBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('Decryption failed. Invalid password or corrupted data.');
  }
}

// ============================================
// Secure Exchange Credential Management
// ============================================

/**
 * Store encrypted exchange credentials
 */
export async function storeExchangeCredentials(
  exchangeId: string,
  credentials: SecureCredentials,
  masterPassword: string,
  permissions: ('read' | 'trade' | 'withdraw')[] = ['read']
): Promise<void> {
  const encryptedCredentials = await encryptData(
    JSON.stringify(credentials),
    masterPassword
  );
  
  const connection: SecureExchangeConnection = {
    exchangeId,
    encryptedCredentials,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    permissions,
  };
  
  // Load existing connections
  const connections = await loadAllConnections();
  
  // Remove existing connection for this exchange if present
  const filtered = connections.filter(c => c.exchangeId !== exchangeId);
  filtered.push(connection);
  
  // Save to localStorage (encrypted data only)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Retrieve and decrypt exchange credentials
 */
export async function getExchangeCredentials(
  exchangeId: string,
  masterPassword: string
): Promise<SecureCredentials | null> {
  const connections = await loadAllConnections();
  const connection = connections.find(c => c.exchangeId === exchangeId);
  
  if (!connection) {
    return null;
  }
  
  try {
    const decrypted = await decryptData(
      connection.encryptedCredentials,
      masterPassword
    );
    
    // Update last used timestamp
    connection.lastUsed = Date.now();
    await saveConnections(connections);
    
    return JSON.parse(decrypted);
  } catch {
    throw new Error('Failed to decrypt credentials. Check your master password.');
  }
}

/**
 * Remove exchange credentials
 */
export async function removeExchangeCredentials(exchangeId: string): Promise<void> {
  const connections = await loadAllConnections();
  const filtered = connections.filter(c => c.exchangeId !== exchangeId);
  await saveConnections(filtered);
}

/**
 * List all connected exchanges (without credentials)
 */
export async function listConnectedExchanges(): Promise<{
  exchangeId: string;
  createdAt: number;
  lastUsed: number;
  permissions: ('read' | 'trade' | 'withdraw')[];
}[]> {
  const connections = await loadAllConnections();
  return connections.map(c => ({
    exchangeId: c.exchangeId,
    createdAt: c.createdAt,
    lastUsed: c.lastUsed,
    permissions: c.permissions,
  }));
}

/**
 * Validate master password by attempting to decrypt first connection
 */
export async function validateMasterPassword(masterPassword: string): Promise<boolean> {
  const connections = await loadAllConnections();
  if (connections.length === 0) return true;
  
  try {
    await decryptData(connections[0].encryptedCredentials, masterPassword);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Internal Helpers
// ============================================

async function loadAllConnections(): Promise<SecureExchangeConnection[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function saveConnections(connections: SecureExchangeConnection[]): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

// ============================================
// Password Strength Checker
// ============================================

export interface PasswordStrength {
  score: number; // 0-100
  label: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  // Length checks
  if (password.length >= 8) score += 20;
  else feedback.push('Use at least 8 characters');
  
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 10;
  else feedback.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score += 15;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  else feedback.push('Add special characters');
  
  // Patterns to avoid
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repeated characters');
  }
  
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10;
    feedback.push('Don\'t use only letters');
  }
  
  // Common patterns
  const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'letmein'];
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score -= 20;
    feedback.push('Avoid common passwords');
  }
  
  // Normalize score
  score = Math.max(0, Math.min(100, score));
  
  let label: PasswordStrength['label'];
  if (score < 30) label = 'weak';
  else if (score < 50) label = 'fair';
  else if (score < 80) label = 'good';
  else label = 'strong';
  
  return { score, label, feedback };
}

// ============================================
// Session Security
// ============================================

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
let sessionKey: CryptoKey | null = null;
let lastActivity = Date.now();

/**
 * Initialize secure session with master password
 * Stores derived key in memory (never persisted)
 */
export async function initializeSession(masterPassword: string): Promise<boolean> {
  try {
    // Validate password against stored credentials
    const isValid = await validateMasterPassword(masterPassword);
    if (!isValid) return false;
    
    // Store derived key in memory for session
    const salt = base64ToBuffer('TradeVisionSession2024');
    sessionKey = await deriveKey(masterPassword, salt);
    lastActivity = Date.now();
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if session is still valid
 */
export function isSessionValid(): boolean {
  if (!sessionKey) return false;
  if (Date.now() - lastActivity > SESSION_TIMEOUT) {
    clearSession();
    return false;
  }
  return true;
}

/**
 * Update session activity timestamp
 */
export function touchSession(): void {
  if (sessionKey) {
    lastActivity = Date.now();
  }
}

/**
 * Clear session (logout)
 */
export function clearSession(): void {
  sessionKey = null;
  lastActivity = 0;
}

/**
 * Get remaining session time in milliseconds
 */
export function getSessionTimeRemaining(): number {
  if (!sessionKey) return 0;
  const remaining = SESSION_TIMEOUT - (Date.now() - lastActivity);
  return Math.max(0, remaining);
}

// ============================================
// Audit Logging
// ============================================

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'connect' | 'disconnect' | 'trade' | 'cancel' | 'modify' | 'view';
  exchangeId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}

const AUDIT_LOG_KEY = 'tv_audit_log';
const MAX_AUDIT_ENTRIES = 1000;

/**
 * Add audit log entry
 */
export function addAuditLog(
  action: AuditLogEntry['action'],
  details: Record<string, unknown>,
  exchangeId?: string
): void {
  const logs = getAuditLogs();
  
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    action,
    exchangeId,
    details,
  };
  
  logs.unshift(entry);
  
  // Keep only recent entries
  if (logs.length > MAX_AUDIT_ENTRIES) {
    logs.splice(MAX_AUDIT_ENTRIES);
  }
  
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
}

/**
 * Get audit logs
 */
export function getAuditLogs(limit = 100): AuditLogEntry[] {
  try {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    const logs: AuditLogEntry[] = stored ? JSON.parse(stored) : [];
    return logs.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Clear audit logs
 */
export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}

// ============================================
// Rate Limiting
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

/**
 * Check and update rate limit
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimits.get(key);
  
  if (!entry || now >= entry.resetAt) {
    // New window
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetAt - now };
}

export default {
  encryptData,
  decryptData,
  storeExchangeCredentials,
  getExchangeCredentials,
  removeExchangeCredentials,
  listConnectedExchanges,
  checkPasswordStrength,
  initializeSession,
  isSessionValid,
  clearSession,
  addAuditLog,
  getAuditLogs,
  checkRateLimit,
};
