import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.unit_of_measure')

const findById = async (unitId, client = null) => {
  const query = `
           SELECT 
            uom.id,
            uom.code,
            uom."name",
            uom.category,
            uom.conversion_factor,
            uom.base_unit_id,
            uom.is_base,
            uom.description,
            uom.created_at,
            us1.full_name as "created_by",
            uom.updated_at,
            us2.full_name as "updated_by"
           FROM interview.unit_of_measure uom
           inner join auth.user us1 on (uom.created_by = us1.id)
           left join auth.user us2 on (uom.updated_by = us2.id)
           where 1=1
           and uom.id = $1`

  const bind = [unitId]

  const response = await db.row(query, bind, client)

  return response
}

const tablePaginated = async (search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            uom.id,
            uom.code,
            uom."name",
            uom.category,
            uom.conversion_factor,
            uom.base_unit_id,
            base_uom."name" as base_unit_name,
            uom.is_base,
            uom.description,
            uom.created_at,
            us1.full_name as "created_by",
            uom.updated_at,
            us2.full_name as "updated_by"
           FROM interview.unit_of_measure uom
           inner join auth.user us1 on (uom.created_by = us1.id)
           left join auth.user us2 on (uom.updated_by = us2.id)
           left join interview.unit_of_measure base_uom on (uom.base_unit_id = base_uom.id)
           where 1=1
            AND (
                uom."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                uom.code ILIKE concat('%', concat($2::varchar, '%')) OR
                uom.category ILIKE concat('%', concat($3::varchar, '%'))
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

const create = async (context, unitId, code, name, category, conversionFactor, baseUnitId, isBase, description, client = null) => {
  const query = `
            INSERT INTO interview.unit_of_measure
            (code, "name", category, conversion_factor, base_unit_id, is_base, description, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `
  const bind = [code, name, category, conversionFactor, baseUnitId || null, isBase, description, context.session.userId, timestamp()]

  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, unitId, code, name, category, conversionFactor, baseUnitId, isBase, description, client = null) => {
  const query = `
            UPDATE interview.unit_of_measure
            SET
              code = $1,
              "name" = $2,
              category = $3,
              conversion_factor = $4,
              base_unit_id = $5,
              is_base = $6,
              description = $7,
              updated_by = $8,
              updated_at = $9
            WHERE id = $10
            RETURNING id
        `
  const bind = [code, name, category, conversionFactor, baseUnitId || null, isBase, description, context.session.userId, timestamp(), unitId]

  const response = await db.query(query, bind, client)

  return response
}

const remove = async (unitId, client = null) => {
  const query = `
        DELETE FROM interview.unit_of_measure
        WHERE id = $1
    `
  const bind = [unitId]
  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (client = null) => {
  const query = `
    SELECT 
      id,
      code,
      "name",
      category,
      is_base
    FROM interview.unit_of_measure
    ORDER BY category, "name"
  `

  const response = await db.query(query, [], client)

  return response
}

export const unitOfMeasureRepository = {
  ...baseRepository,
  findById,
  tablePaginated,
  update,
  create,
  remove,
  listAll
}
