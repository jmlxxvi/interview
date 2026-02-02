import { promisify } from 'node:util'
import {
  scrypt,
  randomBytes,
  timingSafeEqual,
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv
} from 'node:crypto'

const scryptAsync = promisify(scrypt)

/**
 * Hash a password using scrypt.
 *
 * The hashed password is a concatenation of:
 * - the hashed password as a hexadecimal string
 * - the salt used to hash the password, as a hexadecimal string
 *
 * TODO: in the future we may use argon2 as soon as it is supported natively on Node.
 * Here is the issue to follow up: https://github.com/nodejs/node/issues/34452
 * Reference: https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Password_Storage_Cheat_Sheet.md
 *
 * @param {String} password the password to hash
 * @returns {Promise<String>} the hashed password
 */
const passwordHash = async (password) => {
  const salt = randomBytes(16).toString('hex')
  const buf = (await scryptAsync(password, salt, 64))
  return `${buf.toString('hex')}.${salt}`
}

/**
 * Compare a supplied password to a hashed password.
 *
 * The hashed password is the result of password_hash. It is a concatenation of
 * the hashed password as a hexadecimal string and the salt used to hash the
 * password, also as a hexadecimal string.
 *
 * @param {String} password the password to compare
 * @param {String} hash the hashed password
 * @returns {Promise<Boolean>} true if the password matches, false otherwise
 */
const passwordCompare = async (password, hash) => {
  const [hashedPassword, salt] = hash.split('.')
  const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex')
  const suppliedPasswordBuf = (await scryptAsync(password, salt, 64))
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf)
}

const hash = {
  sha256: function (value) {
    return createHash('sha256').update(value).digest('hex')
  }
}

/**
 * Returns HTTP headers that should be set on all responses to ensure maximum security.
 *
 * These headers are based on the OWASP Secure Headers Project:
 * https://owasp.org/www-project-secure-headers/
 *
 * The rationale for each header is as follows:
 * - Content-Security-Policy: set a reasonable default for the Content Security Policy
 * - Cross-Origin-Opener-Policy: prevent a page from being embedded in an iframe
 * - Cross-Origin-Resource-Policy: prevent loading of resources from this site by other sites
 * - Origin-Agent-Cluster: prevent loading of resources from this site by other sites
 * - Referrer-Policy: don't send the referral URL
 * - Strict-Transport-Security: force HTTPS
 * - X-Content-Type-Options: prevent MIME sniffing
 * - X-DNS-Prefetch-Control: prevent DNS prefetching
 * - X-Download-Options: prevent downloads from being opened directly
 * - X-Frame-Options: prevent loading of resources from this site by other sites
 * - X-Permitted-Cross-Domain-Policies: prevent loading of resources from this site by other sites
 * - X-XSS-Protection: disable XSS protection
 *
 * @returns {Object} an object with the HTTP headers to set
 */
function headers () {
  return {
    // "Content-Security-Policy": "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
    // "Content-Security-Policy": "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
    'Content-Security-Policy': "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-XSS-Protection': '0'
  }
}

// UUID Encryption/Decryption for URLs
const MASTER_KEY = createHash('sha256')
  .update(String(process.env.ENCRYPTION_KEY || 'my-strong-secret'))
  .digest()

function deriveSessionKey (sessionId) {
  return createHmac('sha256', MASTER_KEY)
    .update(sessionId)
    .digest()
    .subarray(0, 32) // AES-256 key
}

function deriveIV (uuid) {
  return createHash('md5').update(uuid).digest() // deterministic 16 bytes
}

export function encryptUUID (uuid, sessionId) {
  console.log('uuid, sessionId: ', uuid, sessionId)
  const key = deriveSessionKey(sessionId)
  const iv = deriveIV(uuid)

  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(uuid, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptUUID (encryptedText, sessionId) {
  const [ivHex, encryptedHex] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const key = deriveSessionKey(sessionId)
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

export function decryptUUIDs (encryptedArray, sessionId) {
  return encryptedArray.map(enc => {
    try {
      return decryptUUID(enc, sessionId)
    } catch {
      return null
    }
  }).filter(Boolean)
}

export default {
  hash,
  passwordHash,
  passwordCompare,
  headers,
  encryptUUID,
  decryptUUID,
  decryptUUIDs
}
