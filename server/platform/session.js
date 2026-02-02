import config from '../config.js'
import { stringEnd, timestamp, randomHexaString } from '../utils/index.js'
import log from './log.js'
import { db } from './db/index.js'

import { webSocketsService } from '../services/webSockets.js'

/**
 * @typedef {import("../types.js").SessionType} SessionType
 */

/**
 * Checks if a session token exists.
 *
 * @param {string} token - The session token to look for.
 * @returns {Promise<boolean>} True if the session token exists, false otherwise.
 */
const check = async (token) => {
  console.log('tokenv check: ', token)
  if (token) {
    const updateResponse = await db.dml(`
      UPDATE interview.session 
      SET updated_at = $1
      WHERE session_token = $2`, [timestamp(true), token])

    return updateResponse.affectedRows > 0
  } else {
    return false
  }
}

/**
 * Creates a session and stores the given data associated with it.
 *
 * @param {{token: string, data: object, execId: string}} params - An object containing the session token, the data to store, and the execution id.
 * @returns {Promise<number>} The timestamp of the session creation.
 * @throws An error is thrown if the provided token is invalid.
 */
const create = async ({
  token,
  data,
  execId
}) => {
  if (token) {
    const ts = timestamp(true)

    log.debug(`Session data for token ${stringEnd(token)} is ${JSON.stringify(data)}`, 'session/create', execId)

    const query = `
            INSERT INTO interview.session(
                entity_id,
                plant_id,
                session_token, 
                session_data,
                updated_at
            )
            VALUES(
                $1,
                $2,
                $3,
                $4,
                $5
            )`

    await db.dml(query, [data.entityId, data.plantId, token, data, ts])

    log.debug(`Session created for token ${stringEnd(token)}`, 'session/create', execId)

    return ts
  } else {
    log.error('Cannot create session, empty token', 'session/create', execId)

    throw new Error('Cannot create session with an invalid token')
  }
}

/**
 * Destroys a session given a token.
 *
 * @param {{ execId: string, token: string }} context
 * @return {Promise<string>} The destroyed session token.
 */
const destroy = async ({ execId, token }) => {
  // const token = context.token;

  log.debug(`Deleting cache key ${token}`, 'sessions/destroy', execId)

  await db.dml(`
    DELETE FROM interview.session
    WHERE session_token = $1
  `, [token])

  return token
}

/**
 * Removes expired sessions from the database based on a configured expiration time.
 * Logs the number of sessions expired and schedules the next expiration check.
 */
const expire = async () => {
  const sessionsToExpire = await db.query('select entity_id, plant_id, session_token  from interview.session where updated_at < $1', [timestamp() - (config.session.expire * 1000)])

  for (const session of sessionsToExpire) {
    await webSocketsService.sendMessageToSession(
      session.entityId,
      session.plantId,
      session.sessionToken,
      {
        context: 'session-expired',
        data: session.sessionToken
      }
    )
    await db.query('delete from interview.session where session_token = $1', [session.sessionToken])
    log.debug(`Expired session ${session.sessionToken}`, 'session/expire')
  }
}

/**
 * Get a specific key from a session.
 *
 * @param {string} token - The token of the session to fetch.
 * @param {string} key - The key of the session data to fetch.
 * @return {Promise<string | null>} The value associated with the key, or null if the token is invalid.
 */
const get = async (token, key) => {
  if (token) {
    const data = await getAll(token)

    return (data && data[key]) || null
  } else {
    return null
  }
}

/**
 * Gets all the session data associated with a given token.
 *
 * @param {string} token - The session token to fetch data for.
 * @return {Promise<object>} An object containing all the session data for the given token.
 */
const getAll = async (token) => {
  if (token) {
    const data = await db.value('select session_data as "sessionData" from interview.session where session_token = $1', [token])

    return data || {}
  } else {
    return {}
  }
}

/**
 * Sets a value in the session data associated with a given token.
 *
 * @param {string} token - The session token to update data for.
 * @param {string} key - The key of the session data to update.
 * @param {string} value - The value to set the session data to.
 *
 * @return {Promise<null | object>} null if the token is invalid, an object with the updated row otherwise.
 */
const set = async (token, key, value) => {
  if (token) {
    return await db.dml(`
            UPDATE interview.session SET updated_at = $1, sessionData = jsonb_set(sessionData, '{${key}}', '"${value}"')
            where session_token = $2`, [timestamp(), token])
  } else {
    return null
  }
}

/**
 * Deletes a specific key from a session.
 *
 * @param {string} token - The token of the session to delete the key from.
 * @param {string} key - The key of the session data to delete.
 *
 * @return {Promise<null | object>} null if the token is invalid, an object with the updated row otherwise.
 */
const del = async (token, key) => {
  if (token) {
    return await db.dml(`
            UPDATE interview.session SET updated_at = $1, sessionData = sessionData - '${key}'
            where session_token = $2`, [timestamp(), token])
  } else {
    return null
  }
}

/**
 * Sets multiple values in the session data associated with a given token.
 *
 * @param {string} token - The session token to update data for.
 * @param {object} sessionData - An object containing key-value pairs of session data to update.
 *
 * @return {Promise<null | object>} null if the token is invalid, an object with the updated row otherwise.
 */
const multiSet = async (token, sessionData) => {
  if (token) {
    return await db.dml(`
            UPDATE interview.session SET updated_at = $1, sessionData = $2
            where session_token = $3`, [timestamp(), sessionData, token])
  } else {
    return null
  }
}

/**
 * Generates a random session token.
 *
 * https://www.proxynova.com/tools/brute-force-calculator/
 *
 * @return {string} A random session token, {config.security.token_size / 2} characters long.
 */
const token = () => {
  return randomHexaString(config.security.token_size / 2)
}

/**
 * Gets all session tokens, either for all users or a specific user.
 * @param {string} [userId] - The user ID to get session tokens for. If left out, all tokens are returned.
 * @return {Promise<Array<string>>} An array of session tokens
 */
const tokens = async (userId = null) => {
  let query = 'SELECT session_token FROM interview.session'
  query += userId ? ' WHERE sessionData @> \'{"userId": {userId}}\'' : ''

  const bind = userId ? { userId } : {}

  const tokens = await db.query(query, bind)

  return tokens
}

const getUserId = async (token) => get(token, 'userId')

export default {
  destroy,
  set,
  multiSet,
  get,
  getAll,
  del,
  check,
  token,
  create,
  expire,
  tokens,
  getUserId
}
