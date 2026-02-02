import config from './config.js'

const localStorageKey = config.CONFIG_TOKEN_STORAGE_KEY

/**
 * Retrieves the value associated with the specified key from local storage.
 * If the key does not exist, returns null.
 *
 * @param {string} key - The key whose associated value is to be retrieved.
 * @returns {any} The value associated with the specified key, or null if the key does not exist.
 */
export function storageGet (key) {
  const localStorageData = localStorage.getItem(localStorageKey)

  if (localStorageData) {
    return JSON.parse(localStorageData)[key]
  } else {
    return null
  }
}

/**
 * Stores a key-value pair in the local storage under a common storage key.
 * If the storage key already exists, updates the existing data with the new key-value pair.
 *
 * @param {string} key - The key to be stored.
 * @param {any} value - The value associated with the key to be stored.
 */
export function storageSet (key, value) {
  const localStorageData = localStorage.getItem(localStorageKey)

  if (localStorageData) {
    const _data = JSON.parse(localStorageData)
    _data[key] = value
    localStorage.setItem(localStorageKey, JSON.stringify(_data))
  } else {
    localStorage.setItem(localStorageKey, JSON.stringify({
      [key]: value
    }))
  }
}

/**
 * Removes the specified key-value pair from local storage under a common storage key.
 * If the key does not exist, does nothing.
 *
 * @param {string} key - The key to be removed.
 */
export function storageRemove (key) {
  const localStorageData = localStorage.getItem(localStorageKey)

  if (localStorageData) {
    const _data = JSON.parse(localStorageData)
    delete _data[key]
    localStorage.setItem(localStorageKey, JSON.stringify(_data))
  }
}
