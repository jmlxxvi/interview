import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.operation')

const findById = async (context, entityId, plantId, operationId, client = null) => {
  const query = `
           SELECT 
            op.id,
            op.code,
            op."name",
            op.standard_duration,
            op.description,
            op.created_at,
            us1.full_name as "created_by",
            op.updated_at,
            us2.full_name as "updated_by"
           FROM interview.operation op
           inner join auth.user us1 on (op.created_by = us1.id)
           left join auth.user us2 on (op.updated_by = us2.id)
           where 1=1
           and op.id = $1
           -- Entity and Plant filtering
           AND op.entity_id = $2
           AND op.plant_id = $3
           AND us1.entity_id = $2
           AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
           LIMIT 1`

  const bind = [operationId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const tablePaginated = async (context, entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            op.id,
            op.code,
            op."name",
            op.standard_duration,
            op.description,
            op.created_at,
            us1.full_name as "created_by",
            op.updated_at,
            us2.full_name as "updated_by"
           FROM interview.operation op
           inner join auth.user us1 on (op.created_by = us1.id)
           left join auth.user us2 on (op.updated_by = us2.id)
           where 1=1
            AND (
                op."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                op.code ILIKE concat('%', concat($2::varchar, '%'))
            )
            -- Entity and Plant filtering
            AND op.entity_id = $3
            AND op.plant_id = $4
            AND us1.entity_id = $3
            AND (us2.entity_id = $3 OR us2.entity_id IS NULL)
            ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, operationId, code, name, standardDuration, description, client = null) => {
  const query = `
            INSERT INTO interview.operation
            (id, code, "name", standard_duration, description, created_by, created_at, entity_id, plant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `
  const bind = [operationId, code, name, standardDuration || null, description, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, operationId, code, name, standardDuration, description, client = null) => {
  const query = `
            UPDATE interview.operation
            SET
              code = $1,
              "name" = $2,
              standard_duration = $3,
              description = $4,
              updated_by = $5,
              updated_at = $6, 
              entity_id = $7,
              plant_id = $8
            WHERE id = $9
            RETURNING id
        `
  const bind = [code, name, standardDuration || null, description, context.session.userId, timestamp(), entityId, plantId, operationId]
  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      id,
      code,
      "name",
      standard_duration
    FROM interview.operation
    WHERE entity_id = $1
    AND plant_id = $2
    ORDER BY code
  `

  const response = await db.query(query, [entityId, plantId], client)

  return response
}

export const operationRepository = {
  ...baseRepository,
  findById,
  tablePaginated,
  create,
  update,
  listAll
}
