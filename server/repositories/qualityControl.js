import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.quality_control')

const findById = async (context, entityId, plantId, qualityInspectionId, client = null) => {
  const query = `
           SELECT 
            qi.id,
            qi.batch_id,
            bat.code as batch_code,
            qi.operation_id,
            op.code as operation_code,
            op.name as operation_name,
            qi.inspected_by,
            us1.full_name as inspected_by_name,
            qi.result,
            qi.notes,
            qi.created_at,
            us2.full_name as "created_by",
            qi.updated_at,
            us3.full_name as "updated_by"
           FROM interview.quality_control qi
           LEFT JOIN interview.batch bat ON (qi.batch_id = bat.id)
           LEFT JOIN interview.operation op ON (qi.operation_id = op.id)
           LEFT JOIN auth.user us1 ON (qi.inspected_by = us1.id)
           LEFT JOIN auth.user us2 ON (qi.created_by = us2.id)
           LEFT JOIN auth.user us3 ON (qi.updated_by = us3.id)
           WHERE qi.id = $1
             AND qi.entity_id = $2
             AND qi.plant_id = $3
             AND us1.entity_id = $2
             AND us2.entity_id = $2
             AND (us3.entity_id = $2 OR us3.entity_id IS NULL)`

  const bind = [qualityInspectionId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByBatchOrOperation = async (context, entityId, plantId, search = null, client = null) => {
  const query = `
           SELECT 
            qi.id,
            qi.batch_id,
            bat.code as batch_code,
            qi.operation_id,
            op.code as operation_code,
            op.name as operation_name,
            qi.inspected_by,
            us1.full_name as inspected_by_name,
            qi.result,
            qi.notes,
            qi.created_at,
            us2.full_name as "created_by",
            qi.updated_at,
            us3.full_name as "updated_by"
           FROM interview.quality_control qi
           LEFT JOIN interview.batch bat ON (qi.batch_id = bat.id)
           LEFT JOIN interview.operation op ON (qi.operation_id = op.id)
           LEFT JOIN auth.user us1 ON (qi.inspected_by = us1.id)
           LEFT JOIN auth.user us2 ON (qi.created_by = us2.id)
           LEFT JOIN auth.user us3 ON (qi.updated_by = us3.id)
           WHERE qi.entity_id = $1
             AND qi.plant_id = $2
             AND us1.entity_id = $1
             AND us2.entity_id = $1
             AND (us3.entity_id = $1 OR us3.entity_id IS NULL)
           ${search ? 'AND (bat.code ILIKE concat(\'%\', concat($3::varchar, \'%\')) OR op.name ILIKE concat(\'%\', concat($3::varchar, \'%\')))' : ''}
           ORDER BY qi.created_at DESC`

  const bind = search ? [entityId, plantId, search] : [entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const findAll = async (context, entityId, plantId, client = null) => {
  const query = `
           SELECT 
            qi.id,
            qi.batch_id,
            bat.code as batch_code,
            qi.operation_id,
            op.code as operation_code,
            op.name as operation_name,
            qi.inspected_by,
            us1.full_name as inspected_by_name,
            qi.result,
            qi.notes,
            qi.created_at,
            us2.full_name as "created_by",
            qi.updated_at,
            us3.full_name as "updated_by"
           FROM interview.quality_control qi
           LEFT JOIN interview.batch bat ON (qi.batch_id = bat.id)
           LEFT JOIN interview.operation op ON (qi.operation_id = op.id)
           LEFT JOIN auth.user us1 ON (qi.inspected_by = us1.id)
           LEFT JOIN auth.user us2 ON (qi.created_by = us2.id)
           LEFT JOIN auth.user us3 ON (qi.updated_by = us3.id)
           WHERE qi.entity_id = $1
             AND qi.plant_id = $2
             AND us1.entity_id = $1
             AND us2.entity_id = $1
             AND (us3.entity_id = $1 OR us3.entity_id IS NULL)
           ORDER BY qi.created_at DESC`

  const bind = [entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            qi.id,
            qi.batch_id,
            bat.code as batch_code,
            qi.operation_id,
            op.code as operation_code,
            op.name as operation_name,
            qi.inspected_by,
            us1.full_name as inspected_by_name,
            qi.result,
            qi.notes,
            qi.created_at,
            us2.full_name as "created_by",
            qi.updated_at,
            us3.full_name as "updated_by"
           FROM interview.quality_control qi
           LEFT JOIN interview.batch bat ON (qi.batch_id = bat.id)
           LEFT JOIN interview.operation op ON (qi.operation_id = op.id)
           LEFT JOIN auth.user us1 ON (qi.inspected_by = us1.id)
           LEFT JOIN auth.user us2 ON (qi.created_by = us2.id)
           LEFT JOIN auth.user us3 ON (qi.updated_by = us3.id)
           WHERE qi.entity_id = $4
             AND qi.plant_id = $5
             AND us1.entity_id = $4
             AND us2.entity_id = $4
             AND (us3.entity_id = $4 OR us3.entity_id IS NULL)
            AND (
                bat.code ILIKE concat('%', concat($1::varchar, '%')) OR
                op.name ILIKE concat('%', concat($2::varchar, '%')) OR
                qi.notes ILIKE concat('%', concat($3::varchar, '%'))
            )
            ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, batchId, inspectedBy, result, notes, client = null) => {
  const query = `
            INSERT INTO interview.quality_control
            (batch_id, inspected_by, result, notes, created_by, created_at, entity_id, plant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `
  const bind = [batchId || null, inspectedBy || null, result, notes || null, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, qualityInspectionId, batchId, operationId, inspectedBy, result, notes, client = null) => {
  const query = `
            UPDATE interview.quality_control
            SET
              batch_id = $1,
              operation_id = $2,
              inspected_by = $3,
              result = $4,
              notes = $5,
              updated_by = $6,
              updated_at = $7
            WHERE id = $8
              AND entity_id = $9
              AND plant_id = $10
            RETURNING id
        `
  const bind = [batchId || null, operationId || null, inspectedBy || null, result, notes || null, context.session.userId, timestamp(), qualityInspectionId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const remove = async (context, entityId, plantId, qualityInspectionId, client = null) => {
  const query = `
            DELETE FROM interview.quality_control
            WHERE id = $1
              AND entity_id = $2
              AND plant_id = $3
            RETURNING id
        `
  const bind = [qualityInspectionId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const setResult = async (context, entityId, plantId, qualityControlId, result, notes, client = null) => {
  const query = `
      UPDATE interview.quality_control
      SET
        result = $1,
        notes = $2,
        inspected_by = $3
      WHERE id = $4
        AND entity_id = $5
        AND plant_id = $6
      RETURNING id
    `
  const bind = [result, notes, context.session.userId, qualityControlId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

export const qualityControlRepository = {
  ...baseRepository,
  findById,
  findAll,
  findByBatchOrOperation,
  tablePaginated,
  create,
  update,
  remove,
  setResult
}
