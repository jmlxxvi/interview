import { db } from '../../platform/db/index.js'

// Session operations for interview.session table
const findByToken = async (entityId, plantId, sessionToken, client = null) => {
  const query = `
    SELECT 
      entity_id,
      plant_id,
      session_token,
      session_data,
      updated_at
    FROM interview.session
    WHERE entity_id = $1 AND plant_id = $2 AND session_token = $3
  `
  const bind = [entityId, plantId, sessionToken]

  const result = await db.row(query, bind, client)

  return result
}

const findAll = async (entityId, plantId, client = null) => {
  const query = `
    SELECT 
      entity_id,
      plant_id,
      session_token,
      session_data,
      updated_at
    FROM interview.session
    WHERE entity_id = $1 AND plant_id = $2
    ORDER BY updated_at DESC
  `

  const result = await db.query(query, [entityId, plantId], client)
  return result
}

export const sessionRepository = {
  findByToken,
  findAll
}
