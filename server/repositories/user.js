import { db } from '../platform/db/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.user')

const findAll = async (client = null) => {
  const query = `
    SELECT
      id,
      is_active,
      full_name,
      email,
      created_at,
      created_by
    FROM interview.user
    WHERE is_active = true
    ORDER BY full_name`

  const response = await db.query(query, [], client)
  console.log('response: ', response)

  return response
}

export const userRepository = {
  ...baseRepository,
  findAll
}
