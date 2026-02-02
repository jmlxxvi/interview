import crypto from 'node:crypto'

/**
 * Generates a random string of hexadecimal characters.
 *
 * @param {number} [size=8] The size of the string to generate.
 * @param {boolean} [upper_case=true] Whether the string should be in upper case.
 * @returns {string} The generated random string.
 */
export const randomHexaString = (size = 8, upperCase = true) => {
  const chars = crypto.randomBytes(size).toString('hex')

  return upperCase ? chars.toUpperCase() : chars
}

/**
 * Returns the current timestamp in milliseconds or seconds.
 *
 * @param {boolean} [ms] Defaults to true. If true it returns the timestamp in milliseconds, otherwise in seconds.
 *
 * @returns {number} The current timestamp.
 */
export const timestamp = (ms = true) => {
  return ms ? Date.now() : Math.floor(Date.now() / 1000)
}

/**
 * Returns the end of the given string, or a special string if the argument is not a valid string.
 *
 * @param {string} s The string to get the end of.
 * @param {number} [size] The number of characters of the end of the string to return. Defaults to 8.
 *
 * @returns {string} The end of the string, or "<invalid_string>" if the argument is not a valid string.
 */
export const stringEnd = (s, size = 8) => {
  return s ? '...' + s.slice(-1 * size) : '<invalid_string>'
}

/**
 * Pads the given value with a specified character to a certain length.
 *
 * @param {string|number} value The value to pad.
 * @param {number} [length] The desired length of the string. Defaults to 10.
 * @param {string} [padding_char] The character to use for padding. Defaults to "0".
 *
 * @returns {string} The padded string.
 */
export const pad = (value, length = 10, paddingChar = '0') => {
  return (Array(length).join(paddingChar) + value).slice(-1 * length)
}

/**
 * Waits for the specified amount of milliseconds before resolving a promise.
 *
 * @param {number} ms The amount of milliseconds to wait.
 *
 * @returns {Promise<void>} A promise that is resolved after the specified amount of time.
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generates a v4 UUID string.
 *
 * @returns {string} A v4 UUID string.
 */
export const uuid = () => {
  return crypto.randomUUID()
}

/**
 * Checks if a given string is a valid UUID.
 *
 * Supports UUID v1, v2, v3, v4 and v5.
 *
 * @param {string} value The string to check.
 *
 * @returns {boolean} true if the string is a valid UUID, false otherwise.
 */
export const stringIsUUID = (value) => {
  const index = [
    // UUID v1:
    /^[0-9A-F]{8}-[0-9A-F]{4}-[1][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    // UUID v2:
    /^[0-9A-F]{8}-[0-9A-F]{4}-[2][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    // UUID v3:
    /^[0-9A-F]{8}-[0-9A-F]{4}-[3][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    // UUID v4:
    /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    // UUID v5:
    /^[0-9A-F]{8}-[0-9A-F]{4}-[5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
  ].findIndex(x => x.test(value))

  return index !== -1
}
/**
 * Formats a date according to a specified format string.
 *
 * The format string can contain any of the following special characters:
 *
 * - `%Y`: The year (no leading zeros required).
 * - `%m`: The month (1-12).
 * - `%d`: The day of the month (1-31).
 * - `%H`: The hour (0-23).
 * - `%M`: The minute (0-59).
 * - `%S`: The second (0-59).
 * - `%x`: The millisecond (0-999).
 *
 * Any other characters in the format string will be returned unchanged.
 *
 * If `use_utc` is true, the date will be formatted as if it were in the UTC
 * timezone. Otherwise the local timezone will be used.
 *
 * @param {Date} date The date to format.
 * @param {string} format The format string.
 * @param {boolean} [use_utc=false] Whether to use the UTC timezone or the local timezone.
 *
 * @returns {string} The formatted date string.
 */
export const dateFormat = (date, format, useUtc = false) => {
  const f = useUtc ? 'getUTC' : 'get'
  return format.replace(/%[YmdHMSx]/g, (m) => {
    switch (m) {
      case '%Y': return date[f + 'FullYear']() // no leading zeros required
      case '%m': m = 1 + date[f + 'Month'](); break
      case '%d': m = date[f + 'Date'](); break
      case '%H': m = date[f + 'Hours'](); break
      case '%M': m = date[f + 'Minutes'](); break
      case '%S': m = date[f + 'Seconds'](); break
      case '%x': return ('00' + date[f + 'Milliseconds']()).slice(-3)
    }
    return ('0' + m).slice(-2)
  })
}

// Convert snake_case to camelCase
export const snakeToCamel = (str) => {
  return str.replace(/(_[a-z])/g, (group) => group.toUpperCase().replace('_', ''))
}

// Convert camelCase to snake_case
export const camelToSnake = (str) => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

// Transform object keys from snake_case to camelCase
export const keysToCamel = (obj) => {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamel(item))
  }

  const transformed = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = snakeToCamel(key)
    transformed[newKey] = value
  }
  return transformed
}

// Transform object keys from camelCase to snake_case
export const keysToSnake = (obj) => {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnake(item))
  }

  const transformed = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = camelToSnake(key)
    transformed[newKey] = value
  }
  return transformed
}
