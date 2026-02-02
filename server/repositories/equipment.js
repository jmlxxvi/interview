import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.equipment')

const findById = async (context, entityId, plantId, equipmentId, client = null) => {
  const query = `
    SELECT 
      eq.id,
      eq.code,
      eq."name",
      eq.work_center_id,
      wc."name" as work_center_name,
      eq.status,
      eq.created_at,
      us1.full_name as "created_by",
      eq.updated_at,
      us2.full_name as "updated_by"
    FROM interview.equipment eq
    INNER JOIN auth.user us1 ON (eq.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (eq.updated_by = us2.id)
    LEFT JOIN interview.work_center wc ON (eq.work_center_id = wc.id)
    WHERE eq.id = $1
    -- Entity and Plant filtering
      AND eq.entity_id = $2
      AND eq.plant_id = $3
      AND us1.entity_id = $2
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)`

  const bind = [equipmentId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const tablePaginated = async (context, entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      eq.id,
      eq.code,
      eq."name",
      eq.work_center_id,
      wc."name" as work_center_name,
      eq.status,
      eq.created_at,
      us1.full_name as "created_by",
      eq.updated_at,
      us2.full_name as "updated_by"
    FROM interview.equipment eq
    INNER JOIN auth.user us1 ON (eq.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (eq.updated_by = us2.id)
    LEFT JOIN interview.work_center wc ON (eq.work_center_id = wc.id)
    WHERE 1=1
      AND (
        eq."name" ILIKE concat('%', concat($1::varchar, '%')) OR
        eq.code ILIKE concat('%', concat($2::varchar, '%')) OR
        wc."name" ILIKE concat('%', concat($3::varchar, '%'))
      )
    -- Entity and Plant filtering
      AND eq.entity_id = $4
      AND eq.plant_id = $5
      AND us1.entity_id = $4
      AND (us2.entity_id = $4 OR us2.entity_id IS NULL)
    ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, equipmentId, code, name, workCenterId, status, client = null) => {
  const query = `
      INSERT INTO interview.equipment
      (id, code, "name", work_center_id, status, created_by, created_at, entity_id, plant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `
  const bind = [equipmentId, code, name, workCenterId || null, status, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, equipmentId, code, name, workCenterId, status, client = null) => {
  const query = `
      UPDATE interview.equipment
      SET
        code = $1,
        "name" = $2,
        work_center_id = $3,
        status = $4,
        updated_by = $5,
        updated_at = $6
      WHERE id = $7
      -- Entity and Plant filtering
        AND entity_id = $8
        AND plant_id = $9
      RETURNING id
    `
  const bind = [code, name, workCenterId || null, status, context.session.userId, timestamp(), equipmentId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const remove = async (equipmentId, client = null) => {
  const query = `
    DELETE FROM interview.equipment
    WHERE id = $1
  `
  const bind = [equipmentId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      id,
      code,
      "name",
      work_center_id,
      status
    FROM interview.equipment
    -- Entity and Plant filtering
      WHERE entity_id = $1
      AND plant_id = $2
    ORDER BY "name"
  `

  const response = await db.query(query, [entityId, plantId], client)

  return response
}

export const equipmentRepository = {
  ...baseRepository,
  findById,
  tablePaginated,
  create,
  update,
  remove,
  listAll
}
