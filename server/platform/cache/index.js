import { createClient } from 'redis'
import log from '../log.js'
import scripts from './scripts/index.js'

import config from '../../config.js'
import { uuid } from '../../utils/index.js'

const url = config.cache.url

const urlParts = new URL(url)

const client = createClient({
  url,
  scripts
})

client.on('error', async (error) => {
  log.error('Redis error: ' + error, 'cache/connect', uuid())
})

client.on('connect', async () => {
  log.info('Connected to Redis server at ' + urlParts.hostname + ':' + urlParts.port, 'cache/connect', uuid())
})

export const cache = {
  // Simple Get: returns parsed JSON or null
  get: async (key) => {
    const value = await client.get(key)
    try { return JSON.parse(value) } catch { return value }
  },

  // Simple Set: converts objects to strings automatically
  // ttl is optional (in seconds)
  set: async (key, value, ttl = null) => {
    const strValue = typeof value === 'object' ? JSON.stringify(value) : value
    if (ttl) {
      return client.set(key, strValue, { EX: ttl })
    }
    return client.set(key, strValue)
  },

  // Delete a key
  del: (key) => client.del(key),

  // Increment/Decrement (useful for counters/rate limiting)
  incr: (key) => client.incr(key),

  // Direct access for advanced commands (LLM fallback)
  client,

  connect: async () => {
    await client.connect()
  }

}

/*
// user.service.js
import { UserRepository } from './user.repository.js';
import { cache } from './redis.js';

export const UserService = {
  getUserProfile: async (id) => {
    const cacheKey = `user:${id}`;

    // 1. Try Cache
    const cachedUser = await cache.get(cacheKey);
    if (cachedUser) return cachedUser;

    // 2. Try DB
    const user = await UserRepository.findById(id);

    // 3. Save to Cache for 1 hour
    if (user) {
      await cache.set(cacheKey, user, 3600);
    }

    return user;
  }
};

If Using Valkey >9

import { createClient } from 'redis';
import { randomUUID } from 'crypto';

const client = createClient({ url: process.env.VALKEY_URL });
await client.connect();

export const cache = {
  // ... (previous get/set methods)

  / **
   * Acquire a distributed lock
   * @param {string} key - The resource name
   * @param {number} ttl - Max time to hold lock in seconds
   * @returns {string|null} - The token if successful, null if failed
   * /
  lock: async (key, ttl = 30) => {
    const token = randomUUID();
    // NX = only if not exists, EX = expire in seconds
    const acquired = await client.set(key, token, { NX: true, EX: ttl });
    return acquired === 'OK' ? token : null;
  },

  / **
   * Release a distributed lock safely
   * Uses Valkey 9.0's DELIFEQ command
   * /
  unlock: async (key, token) => {
    // If your Valkey version is < 9.0, the agent would use a Lua script here.
    // Valkey 9.0 allows this atomic one-liner:
    return await client.sendCommand(['DELIFEQ', key, token]);
  }
};

// order.service.js
import { cache } from './valkey.js';

export const OrderService = {
  processOrder: async (orderId) => {
    const lockKey = `lock:order:${orderId}`;

    // 1. Try to get the lock for 10 seconds
    const token = await cache.lock(lockKey, 10);
    if (!token) throw new Error("Order is being processed by another worker");

    try {
      // 2. Perform the critical business logic
      console.log("Processing order...");
      await doHeavyWork();
    } finally {
      // 3. Always release the lock
      await cache.unlock(lockKey, token);
    }
  }
};

*/
