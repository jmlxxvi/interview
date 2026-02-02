import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.inventory_location')

const findById = async (locationId, client = null) => {
  const query = `
           SELECT 
            loc.id,
            loc.code,
            loc."name",
            loc.description,
            loc.is_active,
            loc.created_at,
            us1.full_name as "created_by",
            loc.updated_at,
            us2.full_name as "updated_by"
           FROM interview.inventory_location loc
           inner join auth.user us1 on (loc.created_by = us1.id)
           left join auth.user us2 on (loc.updated_by = us2.id)
           where 1=1
           and loc.is_active = true
           and loc.id = $1`

  const bind = [locationId]

  const response = await db.row(query, bind, client)

  return response
}

const findByNameOrCode = async (search = null, client = null) => {
  const query = `
           SELECT 
            loc.id,
            loc.code,
            loc."name",
            loc.description,
            loc.is_active
           FROM interview.inventory_location loc
           where 1=1
           and loc.is_active = true
           ${search ? 'AND (loc."name" ILIKE concat(\'%\', concat($1::varchar, \'%\')) OR loc.code ILIKE concat(\'%\', concat($1::varchar, \'%\')))' : ''}
           ORDER BY loc."name"
           LIMIT 5`

  const bind = search ? [search] : []

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            loc.id,
            loc.code,
            loc."name",
            loc.description,
            loc.is_active,
            loc.created_at,
            us1.full_name as "created_by",
            loc.updated_at,
            us2.full_name as "updated_by"
           FROM interview.inventory_location loc
           inner join auth.user us1 on (loc.created_by = us1.id)
           left join auth.user us2 on (loc.updated_by = us2.id)
           where 1=1
           and loc.is_active = true
            AND (
                loc."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                loc.code ILIKE concat('%', concat($2::varchar, '%')) OR
                loc.description ILIKE concat('%', concat($3::varchar, '%'))
            )
            ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, search]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, locationId, locationName, locationCode, locationDescription, client = null) => {
  const query = `
            INSERT INTO interview.inventory_location
            (id, "name", code, description, created_by, created_at, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING id
        `
  const bind = [locationId, locationName, locationCode, locationDescription || null, context.session.userId, timestamp()]

  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, locationId, locationName, locationCode, locationDescription, client = null) => {
  const query = `
            UPDATE interview.inventory_location
            SET
              "name" = $1,
              code = $2,
              description = $3,
              updated_by = $4,
              updated_at = $5
            WHERE id = $6
            RETURNING id
        `
  const bind = [locationName, locationCode, locationDescription || null, context.session.userId, timestamp(), locationId]

  const response = await db.query(query, bind, client)

  return response
}

const deleteById = async (locationId, client = null) => {
  const query = `
            UPDATE interview.inventory_location
            SET
              is_active = false
            WHERE id = $1
            RETURNING id
        `
  const bind = [locationId]

  const response = await db.query(query, bind, client)

  return response
}

const findAll = async (client = null) => {
  const query = `
    SELECT 
      loc.id,
      loc.code,
      loc."name",
      loc.description
    FROM interview.inventory_location loc
    WHERE loc.is_active = true
    ORDER BY loc."name" ASC
  `

  const response = await db.query(query, [], client)

  return response
}

export const inventoryLocationRepository = {
  ...baseRepository,
  findById,
  findByNameOrCode,
  tablePaginated,
  create,
  update,
  deleteById,
  findAll
}
