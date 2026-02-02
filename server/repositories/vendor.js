import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.vendor')

const findById = async (context, entityId, plantId, vendorId, client = null) => {
  const query = `
           SELECT 
            ven.id,
            ven.code,
            ven."name",
            ven.tax_id,
            ven.contact_name,
            ven.email,
            ven.phone,
            ven.address,
            ven.city,
            ven.state,
            ven.country,
            ven.postal_code,
            ven.is_active,
            ven.created_at,
            us1.full_name as "created_by",
            ven.updated_at,
            us2.full_name as "updated_by"
           FROM interview.vendor ven
           inner join auth.user us1 on (ven.created_by = us1.id)
           left join auth.user us2 on (ven.updated_by = us2.id)
           where 1=1
           and ven.is_active = true
           and ven.id = $1
           -- Entity and Plant filtering
           AND ven.entity_id = $2
           AND ven.plant_id = $3
           AND us1.entity_id = $2
           AND (us2.entity_id = $2 or us2.entity_id IS NULL)`

  const bind = [vendorId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByNameOrCode = async (context, entityId, plantId, search = null, client = null) => {
  const query = `
           SELECT 
            ven.id,
            ven.code,
            ven."name",
            ven.tax_id,
            ven.contact_name,
            ven.email,
            ven.phone,
            ven.address,
            ven.city,
            ven.state,
            ven.country,
            ven.postal_code,
            ven.is_active,
            ven.created_at,
            us1.full_name as "created_by",
            ven.updated_at,
            us2.full_name as "updated_by"
           FROM interview.vendor ven
           inner join auth.user us1 on (ven.created_by = us1.id)
           left join auth.user us2 on (ven.updated_by = us2.id)
           where 1=1
           and ven.is_active = true
           ${search ? 'AND (ven."name" ILIKE concat(\'%\', concat($3::varchar, \'%\')) OR ven.code ILIKE concat(\'%\', concat($3::varchar, \'%\')))' : ''}
            -- Entity and Plant filtering
            AND ven.entity_id = $1
            AND ven.plant_id = $2
            AND us1.entity_id = $1
            AND (us2.entity_id = $1 or us2.entity_id IS NULL)
           ORDER BY ven."name"`

  const bind = search ? [entityId, plantId, search] : [entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const findAll = async (context, entityId, plantId, client = null) => {
  const query = `
           SELECT 
            ven.id,
            ven.code,
            ven."name",
            ven.tax_id,
            ven.contact_name,
            ven.email,
            ven.phone,
            ven.address,
            ven.city,
            ven.state,
            ven.country,
            ven.postal_code,
            ven.is_active,
            ven.created_at,
            us1.full_name as "created_by",
            ven.updated_at,
            us2.full_name as "updated_by"
           FROM interview.vendor ven
           inner join auth.user us1 on (ven.created_by = us1.id)
           left join auth.user us2 on (ven.updated_by = us2.id)
           where 1=1
           and ven.is_active = true
           -- Entity and Plant filtering
           AND ven.entity_id = $1
           AND ven.plant_id = $2
           AND us1.entity_id = $1
           AND us2.entity_id = $1
           ORDER BY ven."name"`

  const bind = [entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (context, entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            ven.id,
            ven.code,
            ven."name",
            ven.tax_id,
            ven.contact_name,
            ven.email,
            ven.phone,
            ven.address,
            ven.city,
            ven.state,
            ven.country,
            ven.postal_code,
            ven.is_active,
            ven.created_at,
            us1.full_name as "created_by",
            ven.updated_at,
            us2.full_name as "updated_by"
           FROM interview.vendor ven
           inner join auth.user us1 on (ven.created_by = us1.id)
           left join auth.user us2 on (ven.updated_by = us2.id)
           where 1=1
           and ven.is_active = true
            AND (
                ven."name" ILIKE concat('%', concat($3::varchar, '%')) OR
                ven.contact_name ILIKE concat('%', concat($3::varchar, '%'))
            )
            -- Entity and Plant filtering
            AND ven.entity_id = $1
            AND ven.plant_id = $2
            AND us1.entity_id = $1
            AND (us2.entity_id = $1 or us2.entity_id IS NULL)
            ORDER BY ${orderCol} ${orderDir}`

  const bind = [entityId, plantId, search]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, vendorId, vendorName, vendorCode, vendorEmail, client = null) => {
  const query = `
            INSERT INTO interview.vendor
            (id, "name", code, email, created_by, created_at, is_active, entity_id, plant_id)
            VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
            RETURNING id
        `
  const bind = [vendorId, vendorName, vendorCode, vendorEmail, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, vendorId, vendorName, vendorCode, vendorEmail, client = null) => {
  const query = `
            UPDATE interview.vendor
            SET
              "name" = $1,
              code = $2,
              email = $3,
              updated_by = $4,
              updated_at = $5
            WHERE id = $6
            -- Entity and Plant filtering
            AND entity_id = $7
            AND plant_id = $8
            RETURNING id
        `
  const bind = [vendorName, vendorCode, vendorEmail, context.session.userId, timestamp(), vendorId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const remove = async (context, vendorId, client = null) => {
  const query = `
            UPDATE interview.vendor
            SET
              is_active = false,
              updated_by = $1,
              updated_at = $2
            WHERE id = $3
            RETURNING id
        `
  const bind = [context.session.userId, timestamp(), vendorId]

  const response = await db.query(query, bind, client)

  return response
}

export const vendorRepository = {
  ...baseRepository,
  findById,
  findAll,
  findByNameOrCode,
  tablePaginated,
  create,
  update,
  remove
}
