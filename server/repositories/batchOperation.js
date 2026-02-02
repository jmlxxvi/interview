import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.batch_operation')

const findById = async (context, entityId, plantId, batchOperationId, client = null) => {
  const query = `
    SELECT 
      bop.id,
      bop.batch_id,
      bat.code as batch_code,
      bop.operation_id,
      op.code as operation_code,
      op."name" as operation_name,
      bop.equipment_id,
      eq.code as equipment_code,
      eq."name" as equipment_name,
      bop.operator_id,
      oper.full_name as operator_name,
      bop.sequence,
      bop.actual_start,
      bop.actual_end,
      bop.status,
      bop.notes,
      bop.created_at,
      us1.full_name as created_by,
      bop.updated_at,
      us2.full_name as updated_by
    FROM interview.batch_operation bop
    INNER JOIN interview.batch bat ON (bop.batch_id = bat.id)
    INNER JOIN interview.operation op ON (bop.operation_id = op.id)
    LEFT JOIN interview.equipment eq ON (bop.equipment_id = eq.id)
    LEFT JOIN auth.user oper ON (bop.operator_id = oper.id)
    INNER JOIN auth.user us1 ON (bop.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bop.updated_by = us2.id)
    WHERE bop.id = $1
    AND op.entity_id = $2
    AND op.plant_id = $3
    `

  const bind = [batchOperationId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByBatchId = async (batchId, client = null) => {
  const query = `
    SELECT 
      bop.id,
      bop.batch_id,
      bat.code as batch_code,
      bop.operation_id,
      op.code as operation_code,
      op."name" as operation_name,
      bop.equipment_id,
      eq.code as equipment_code,
      eq."name" as equipment_name,
      bop.operator_id,
      oper.full_name as operator_name,
      bop.sequence,
      bop.actual_start,
      bop.actual_end,
      bop.status,
      bop.notes,
      bop.created_at,
      us1.full_name as created_by,
      bop.updated_at,
      us2.full_name as updated_by
    FROM interview.batch_operation bop
    INNER JOIN interview.batch bat ON (bop.batch_id = bat.id)
    INNER JOIN interview.operation op ON (bop.operation_id = op.id)
    LEFT JOIN interview.equipment eq ON (bop.equipment_id = eq.id)
    LEFT JOIN auth.user oper ON (bop.operator_id = oper.id)
    INNER JOIN auth.user us1 ON (bop.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bop.updated_by = us2.id)
    WHERE bop.batch_id = $1
    ORDER BY bop.sequence ASC`

  const bind = [batchId]

  const response = await db.row(query, bind, client)

  return response
}

const tablePaginated = async (search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      bop.id,
      bop.batch_id,
      bat.code as batch_code,
      bop.operation_id,
      op.code as operation_code,
      op."name" as operation_name,
      bop.equipment_id,
      eq.code as equipment_code,
      eq."name" as equipment_name,
      bop.operator_id,
      oper.full_name as operator_name,
      bop.sequence,
      bop.actual_start,
      bop.actual_end,
      bop.status,
      bop.notes,
      bop.created_at,
      us1.full_name as created_by,
      bop.updated_at,
      us2.full_name as updated_by
    FROM interview.batch_operation bop
    INNER JOIN interview.batch bat ON (bop.batch_id = bat.id)
    INNER JOIN interview.operation op ON (bop.operation_id = op.id)
    LEFT JOIN interview.equipment eq ON (bop.equipment_id = eq.id)
    LEFT JOIN auth.user oper ON (bop.operator_id = oper.id)
    INNER JOIN auth.user us1 ON (bop.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bop.updated_by = us2.id)
    WHERE 1=1
      AND (
        bat.code ILIKE concat('%', concat($1::varchar, '%')) OR
        op."name" ILIKE concat('%', concat($2::varchar, '%')) OR
        op.code ILIKE concat('%', concat($3::varchar, '%')) OR
        eq."name" ILIKE concat('%', concat($4::varchar, '%'))
      )
    ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, search, search]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  if (dataCount.status.error || dataRows.status.error) {
    return Result.fail(dataCount.status.message || dataRows.status.message)
  }

  return Result.ok({
    count: parseInt(dataCount),
    rows: dataRows.rows
  })
}

const create = async (context, entityId, plantId, id, batchId, operationId, equipmentId, operatorId, sequence, status, notes, client = null) => {
  const query = `
    INSERT INTO interview.batch_operation
    (id, batch_id, operation_id, equipment_id, operator_id, sequence, status, 
    notes, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `
  const bind = [
    id,
    batchId,
    operationId,
    equipmentId || null,
    operatorId || null,
    sequence,
    status || 'PENDING',
    notes || null,
    context.session.userId,
    timestamp(),
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, batchOperationId, batchId, operationId, equipmentId, operatorId, sequence, startTimestamp, endTimestamp, status, notes, requiresQualityControl, client = null) => {
  const query = `
    UPDATE interview.batch_operation
    SET
      batch_id = $1,
      operation_id = $2,
      equipment_id = $3,
      operator_id = $4,
      sequence = $5,
      actual_start = $6,
      actual_end = $7,
      status = $8,
      notes = $9,
      updated_by = $10,
      updated_at = $11,
      requires_quality_control = $12
    WHERE id = $13
    RETURNING id
  `
  const bind = [
    batchId,
    operationId,
    equipmentId || null,
    operatorId || null,
    sequence,
    startTimestamp || null,
    endTimestamp || null,
    status || 'PENDING',
    notes || null,
    context.session.userId,
    timestamp(),
    requiresQualityControl,
    batchOperationId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const deleteById = async (batchOperationId, client = null) => {
  const query = `
    DELETE FROM interview.batch_operation
    WHERE id = $1
    RETURNING id
  `
  const bind = [batchOperationId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (client = null) => {
  const query = `
    SELECT 
      bop.id,
      bop.batch_id,
      bat.code as batch_code,
      bop.operation_id,
      op.code as operation_code,
      op."name" as operation_name,
      bop.sequence,
      bop.status
    FROM interview.batch_operation bop
    INNER JOIN interview.batch bat ON (bop.batch_id = bat.id)
    INNER JOIN interview.operation op ON (bop.operation_id = op.id)
    ORDER BY bop.batch_id, bop.sequence
  `

  const response = await db.query(query, [], client)

  return response
}

const updateStatus = async (context, entityId, plantId, batchOperationId, status, client = null) => {
  const query = `
    UPDATE interview.batch_operation
    SET
      status = $1,
      updated_at = $2,
      updated_by = $3
    WHERE id = $4
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [status, timestamp(), context.session.userId, batchOperationId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const setStartTime = async (context, entityId, plantId, batchOperationId, actualStart, client = null) => {
  const query = `
    UPDATE interview.batch_operation
    SET
      actual_start = $1,
      updated_at = $2,
      updated_by = $3
    WHERE id = $4
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [actualStart, timestamp(), context.session.userId, batchOperationId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const setEndTime = async (context, entityId, plantId, batchOperationId, actualEnd, client = null) => {
  const query = `
    UPDATE interview.batch_operation
    SET
      actual_end = $1,
      updated_at = $2,
      updated_by = $3
    WHERE id = $4
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [actualEnd, timestamp(), context.session.userId, batchOperationId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

export const batchOperationRepository = {
  ...baseRepository,
  findById,
  findByBatchId,
  tablePaginated,
  create,
  update,
  deleteById,
  listAll,
  updateStatus,
  setStartTime,
  setEndTime
}
