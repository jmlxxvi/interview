/*
Usage

import { config, set, get, update, del, clear, keys, values, setMany, getMany, size, has } from './db.js';

// Optional: change database or store name
config({ dbName: 'my-db', storeName: 'my-store' });

// Basic set/get
await set('counter', { count: 1 });

await update('counter', value => {
  value.count += 1;
  return value;
});

console.log(await get('counter'));  // { count: 2 }

// Bulk set/get
await setMany([
  ['foo', 123],
  ['bar', 456],
]);

console.log(await getMany(['foo', 'bar', 'baz']));  // [123, 456, undefined]

// keys/values/size/has
console.log(await keys());
console.log(await values());
console.log(await size());
console.log(await has('foo'));

// delete/clear
await del('foo');
await clear();

*/

let DB_NAME = 'app-db'
let STORE_NAME = 'store'
const DB_VERSION = 1

let dbPromise = null

function openDB () {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = (event) => {
      resolve(event.target.result)
    }

    request.onerror = (e) => reject(e.target.error)
  })

  return dbPromise
}

export function dbConfig ({ dbName, storeName }) {
  if (dbName) DB_NAME = dbName
  if (storeName) STORE_NAME = storeName
  dbPromise = null // force reopen
}

export async function dbSet (key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function dbGet (key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function dbDel (key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function dbClear () {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function dbKeys () {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAllKeys()
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function dbValues () {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function dbSize () {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function dbHas (key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getKey(key)
    req.onsuccess = () => resolve(req.result !== undefined)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function dbSetMany (entries) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const [key, value] of entries) {
      store.put(value, key)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function dbGetMany (keysArray) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const results = []
    let remaining = keysArray.length
    if (remaining === 0) return resolve(results)

    for (const key of keysArray) {
      const req = store.get(key)
      req.onsuccess = () => {
        results.push(req.result)
        remaining--
        if (remaining === 0) resolve(results)
      }
      req.onerror = (e) => reject(e.target.error)
    }
  })
}

export async function dbUpdate (key, updater) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(key)
    let value = null
    req.onsuccess = () => {
      value = req.result
      try {
        value = updater(value)
      } catch (e) {
        tx.abort()
        reject(e)
        return
      }
      store.put(value, key)
    }
    req.onerror = (e) => reject(e.target.error)

    tx.oncomplete = () => resolve(value)
    tx.onerror = (e) => reject(e.target.error)
  })
}
