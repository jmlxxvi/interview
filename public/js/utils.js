// This is an good enough random string to be used on HTML elements dynamic IDs
export function suid () {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12).padStart(12, '0')
}

export function uuid () {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  } else {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
}

/**
 * Returns the current timestamp in milliseconds or seconds.
 *
 * @param {boolean} [ms] Defaults to true. If true it returns the timestamp in milliseconds, otherwise in seconds.
 *
 * @returns {number} The current timestamp.
 */
export const timestamp = (ms = false) => {
  return ms ? Date.now() : Math.floor(Date.now() / 1000)
}

/**
 *
 * Example usage:
 * const searchInput = document.querySelector('#entities__search');

 * searchInput.addEventListener('input', debounce((event) => {
 *   t1.search(event.target.value);
 *   console.log('Search changed ' + event.target.value);
 * }, 300)); // 300ms delay is typical
 */
export function debounce (fn, delay = 500) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
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

export function formatSnakeCaseToTitle (str) {
  if (!str || typeof str !== 'string') return ''

  // Words to keep lowercase (except the first word)
  const lowercaseWords = ['for', 'and', 'the', 'of', 'in', 'on', 'at', 'to', 'by']

  const words = str.toLowerCase().split('_')

  return words
    .map((word, index) => {
      // Always capitalize the first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      // Keep certain words lowercase in the middle
      if (lowercaseWords.includes(word)) {
        return word
      }
      // Capitalize other words
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
