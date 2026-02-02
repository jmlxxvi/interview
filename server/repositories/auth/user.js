import { db } from '../../platform/db/index.js'
// import { Result } from '../../utils/result.js'

import { securityService } from '../../services/securityService.js'

import { createBaseRepository } from '../base.js'

const baseRepository = createBaseRepository('interview.user')

// User-specific operations
const findByEmail = async (context, email, client = null) => {
  const result = await db.row(
    `SELECT
      id,
      is_active,
      full_name,
      email,
      password_hash,
      recovery_token,
      recovery_timestamp,
      is_email_verified,
      created_at,
      created_by
    FROM interview.user
    WHERE email = $1`,
    [email],
    client
  )
  return result
}

const findByEmailCaseInsensitive = async (context, email, client = null) => {
  const query = `
    SELECT
      usr.id as "user_id",
      usr.is_active,
      usr.full_name as "user_name",
      usr.email,
      usr.password_hash,
      usr.recovery_token,
      usr.recovery_timestamp,
      usr.is_email_verified,
      usr.created_at,
      usr.created_by,
      plt.id as "plant_id",
      plt.code as "plant_code",
      plt.name as "plant_name",
      ent.id as "entity_id",
      ent.name as "entity_name"
      FROM interview.user usr 
      JOIN interview.entity ent ON usr.entity_id = ent.id
      JOIN interview.plant plt ON (usr.default_plant_id = plt.id AND plt.entity_id = ent.id)
      WHERE 1=1
      AND LOWER(usr.email) = LOWER($1)
      AND ent.is_active = true
      AND plt.is_active = true
      LIMIT 1`

  const bind = [email]

  const result = await db.row(query, bind, client)

  return result
}

const findById = async (context, userId, entityId, client = null) => {
  const bind = [userId]

  let query = `SELECT 
      u.id AS "userId",
      u.is_active AS "isActive",
      u.full_name AS "userName",
      u.email,
      COALESCE(
        json_agg(
          json_build_object(
            'id', e.id,
            'entity_name', e.entity_name,
            'entity_address', e.entity_address,
            'is_active', e.is_active,
            'is_customer', e.is_customer
          )
        ) FILTER (WHERE e.id IS NOT NULL),
        '[]'::json
      ) AS entities
    FROM interview.user u
    LEFT JOIN fman.users_entities ue ON u.id = ue.user_id
    LEFT JOIN fman.entities e ON ue.entity_id = e.id
    WHERE u.id = $1`

  if (entityId) {
    query += ' AND e.id = $2'
    bind.push(entityId)
  }

  query += ' GROUP BY u.id, u.full_name, u.email ORDER BY u.full_name'

  const result = await db.row(
    query,
    bind,
    client
  )

  // TODO we are calling a service from a repository, needs refactor
  const resultAuth = await securityService.getUserAuthorization(context, userId)

  const { permissions, roles } = resultAuth.value

  return {
    ...(result || {}),
    roles,
    permissions
  }
}

const updateLastLogin = async (context, userId, client = null) => {
  const result = await db.query(
    'UPDATE users SET last_login = $1 WHERE id = $2 RETURNING *',
    [new Date(), userId],
    client
  )

  return result
}

const tablePaginated = async (context, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
                usr.id,
                usr.full_name,
                usr.email,
                usr.is_active,
                usr.created_at,
                cby.full_name as "created_by",
                usr.id as "edit_id"
            FROM interview.users usr
            JOIN interview.users cby ON (usr.created_by = cby.id)
            WHERE (
                usr.full_name ILIKE concat('%', concat($1::varchar, '%')) OR
                usr.email ILIKE concat('%', concat($2::varchar, '%'))
            )
            ORDER BY usr.${orderCol} ${orderDir}`

  const bind = [search, search]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  if (dataCount.status.error || dataRows.status.error) {
    throw new Error(dataCount.status.message || dataRows.status.message)
  }

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

async function addRolesToUser (context, userId, roles, client = null) {
  console.log('userId, roles: ', userId, roles)
  await db.query('delete from interview.user_roles where user_id = {userId}', { userId })

  for (const roleId of roles) {
    await db.insert({
      table: 'interview.user_roles',
      values: {
        user_id: userId,
        role_id: roleId
      }
    })
  }
}

async function addEntitiesToUser (context, userId, entities, client = null) {
  console.log('userId, entities: ', userId, entities)
  await db.query('delete from fman.users_entities where user_id = {userId}', { userId })

  for (const entityId of entities) {
    await db.insert({
      table: 'fman.users_entities',
      values: {
        user_id: userId,
        entity_id: entityId
      }
    })
  }
}

async function userEntitiesLookup (context, userId, search, client = null) {
  let query = `select * from (select 
                    id as key, 
                    entity_name as value,
                    'a' as type
                  from fman.entities where id in (select entity_id from fman.users_entities where user_id = $1)
                  union all
                  select 
                    id, 
                    entity_name,
                    'b'
                  from fman.entities 
                  where is_active = true`

  const bind = [userId]

  if (search) {
    query += ' and (upper(entity_name) like upper($2::varchar) or id::text like $3::text)'
    bind.push(`%${search}%`, `%${search}%`)
  }

  query += ') order by 3, 2 limit 10'

  const resultDb = await db.query(query, bind, client)

  return resultDb
};

export const userRepository = {
  ...baseRepository,
  findByEmail,
  findByEmailCaseInsensitive,
  findById,
  updateLastLogin,
  tablePaginated,
  addRolesToUser,
  addEntitiesToUser,
  userEntitiesLookup
}
