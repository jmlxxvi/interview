import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.work_center')

const findById = async (context, entityId, plantId, workCenterId, client = null) => {
  const query = `
           SELECT 
            wc.id,
            wc.code,
            wc."name",
            wc.description,
            wc.location,
            wc.is_active,
            wc.created_at,
            us1.full_name as "created_by",
            wc.updated_at,
            us2.full_name as "updated_by"
           FROM interview.work_center wc
           inner join auth.user us1 on (wc.created_by = us1.id)
           left join auth.user us2 on (wc.updated_by = us2.id)
           where 1=1
           and wc.is_active = true
           and wc.id = $1
           -- Entity and Plant filtering
           AND wc.entity_id = $2
           AND wc.plant_id = $3
           AND us1.entity_id = $2
           AND (us2.entity_id = $2 OR us2.entity_id IS NULL)`

  const bind = [workCenterId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const tablePaginated = async (context, entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            wc.id,
            wc.code,
            wc."name",
            wc.description,
            wc.location,
            wc.is_active,
            wc.created_at,
            us1.full_name as "created_by",
            wc.updated_at,
            us2.full_name as "updated_by"
           FROM interview.work_center wc
           inner join auth.user us1 on (wc.created_by = us1.id)
           left join auth.user us2 on (wc.updated_by = us2.id)
           where 1=1
           and wc.is_active = true
            AND (
                wc."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                wc.code ILIKE concat('%', concat($1::varchar, '%')) OR
                wc.location ILIKE concat('%', concat($1::varchar, '%'))
            )
            -- Entity and Plant filtering
            AND wc.entity_id = $2
            AND wc.plant_id = $3
            AND us1.entity_id = $2
            AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
            ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, workCenterId, code, name, description, location, client = null) => {
  const query = `
            INSERT INTO interview.work_center
            (id, code, "name", description, location, created_by, created_at, is_active, entity_id, plant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
            RETURNING id
        `
  const bind = [workCenterId, code, name, description, location, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, workCenterId, code, name, description, location, client = null) => {
  const query = `
            UPDATE interview.work_center
            SET
              code = $1,
              "name" = $2,
              description = $3,
              location = $4,
              updated_by = $5,
              updated_at = $6
            WHERE id = $7
            -- Entity and Plant filtering
            AND entity_id = $8
            AND plant_id = $9
            RETURNING id
        `
  const bind = [code, name, description, location, context.session.userId, timestamp(), workCenterId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const remove = async (context, workCenterId, client = null) => {
  const query = `
            UPDATE interview.work_center
            SET
              is_active = false,
              updated_by = $1,
              updated_at = $2
            WHERE id = $3
            RETURNING id
        `
  const bind = [context.session.userId, timestamp(), workCenterId]

  const response = await db.query(query, bind, client)

  return response
}

const findAll = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      id,
      code,
      "name",
      location
    FROM interview.work_center
    WHERE is_active = true
    -- Entity and Plant filtering
    AND entity_id = $1
    AND plant_id = $2
    ORDER BY code
  `

  const response = await db.query(query, [entityId, plantId], client)

  return response
}

export const workCenterRepository = {
  ...baseRepository,
  findById,
  tablePaginated,
  create,
  remove,
  update,
  findAll
}
