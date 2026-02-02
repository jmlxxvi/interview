import { Pool, types } from 'pg'

import config from '../../config.js'
import log from '../log.js'
import { uuid, keysToCamel } from '../../utils/index.js'

const execId = uuid()

let pool = null

// Because numeric is returned as string instead of number we use this custom datatype to transform it
// The reason for this behaviour is documented here: https://github.com/brianc/node-pg-types

types.setTypeParser(20, (val) => {
  // Only parse if it's within safe range
  if (val.length <= 15) { // Rough check for numbers <= MAX_SAFE_INTEGER
    const num = parseInt(val, 10)
    return num <= Number.MAX_SAFE_INTEGER ? num : val
  }
  log.error(`INT8 value ${val} exceeds safe integer range, returning as string`)
  return val // Keep as string for large numbers
})

types.setTypeParser(1700, (val) => { // 1700 = NUMERIC
  return parseFloat(val)
})

export const db = {
  // Base query: uses provided client or defaults to pool
  query: async (sql, params, client) => {
    client = client || pool
    const { rows } = await client.query(sql, params)
    return keysToCamel(rows)
  },

  // Returns first row: db.row(sql, params, client)
  row: async (sql, params, client) => {
    client = client || pool
    const { rows } = await client.query(sql, params)
    return keysToCamel(rows[0]) || null
  },

  // Returns first value: db.value(sql, params, client)
  value: async (sql, params, client) => {
    client = client || pool
    const { rows } = await client.query(sql, params)
    return rows[0] ? Object.values(rows[0])[0] : null
  },

  // Data Manipulation (Insert/Update/Delete with RETURNING)
  dml: async (text, params, client) => {
    client = client || pool
    const response = await client.query(text, params)
    return {
      affectedRows: response.rowCount,
      ...(keysToCamel(response.rows[0]) || {})
    }
  },

  // Transaction wrapper
  transaction: async (callback) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Pass the client into the callback so internal calls can use it
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  },

  connect: async () => {
    try {
      log.info('Connecting to the database...', 'db/connect', execId)

      const dbUrl = (config.db.url || 'postgresql://postgres:postgres@localhost:5432/postgres')

      const urlParts = new URL(dbUrl)

      pool = new Pool({
        connectionString: dbUrl,
        // all valid client config options are also valid here
        // in addition here are the pool specific configuration parameters:
        // number of milliseconds to wait before timing out when connecting a new client
        // by default this is 0 which means no timeout
        connectionTimeoutMillis: 10000,
        // number of milliseconds a client must sit idle in the pool and not be checked out
        // before it is disconnected from the backend and discarded
        // default is 10000 (10 seconds) - set to 0 to disable auto-disconnection of idle clients
        idleTimeoutMillis: 10000,
        // maximum number of clients the pool should contain
        // by default this is set to 10.
        max: 4,
        // Default behavior is the pool will keep clients open & connected to the backend
        // until idleTimeoutMillis expire for each client and node will maintain a ref
        // to the socket on the client, keeping the event loop alive until all clients are closed
        // after being idle or the pool is manually shutdown with `pool.end()`.
        //
        // Setting `allowExitOnIdle: true` in the config will allow the node event loop to exit
        // as soon as all clients in the pool are idle, even if their socket is still open
        // to the postgres server.  This can be handy in scripts & tests
        // where you don't want to wait for your clients to go idle before your process exits.
        // allowExitOnIdle: boolean
        ssl: false // ssl
      })

      pool.on('connect', (_client) => {
        log.info(`Connected to ${urlParts.username}@${urlParts.host}${urlParts.pathname}`, 'db/connect', execId)
      })

      pool.on('error', (error, _client) => {
        log.error(`Unexpected error on database client: ${error.message}`, 'db/connect', execId)
      })

      // pool.on("acquire", (_client) => {
      //     // TODO we may want to alert on high "waiting" clients, that usually means the pool size is too small and/or transactions rate is too high
      //     log.trace(`DB client was acquired for database [${db_role}], total/idle/waiting: ${pools.totalCount}/${pools.idleCount}/${pools.waitingCount}`, "db/postgresql/connect", execId);
      // });

      // pool.on("remove", (_client) => {
      //     log.trace(`DB client was removed for database [${db_role}], total/idle/waiting: ${pools.totalCount}/${pools.idleCount}/${pools.waitingCount}`, "db/postgresql/connect", execId);
      // });
    } catch (error) {
      log.error(`Error connecting to the database: ${error.message}`, 'db/connect', execId)
      // Wait for a while before reconnecting
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return db.connect()
    }
  }
}

/*
// user.repository.js
export const UserRepository = {
  // The 'client' param is optional.
  // If passed, it stays in the transaction. If not, it's a standalone query.
  create: (name, client) =>
    db.row('INSERT INTO users(name) VALUES($1) RETURNING id', [name], client),

  updateLogs: (userId, action, client) =>
    db.query('INSERT INTO logs(user_id, action) VALUES($1, $2)', [userId, action], client)
};

// logic.js (The AI writes this)
await db.transaction(async (tx) => {
  const user = await UserRepository.create('John Doe', tx); // Uses tx client
  await UserRepository.updateLogs(user.id, 'created', tx);  // Uses tx client
});
*/
