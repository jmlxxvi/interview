import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.batch')

const findById = async (context, entityId, plantId, batchId, client = null) => {
  const query = `
    SELECT 
      bat.id,
      bat.code,
      prd.code as product_code,
      prd."name" as product_name,
      bat.work_order_id,
      wo.code as work_order_code,
      bat.assigned_employee_id,
      emp.full_name as assigned_employee_name,
      bat.status,
      bat.quantity,
      bat.planned_start,
      bat.planned_end,
      bat.actual_start,
      bat.actual_end,
      bat.created_at,
      us1.full_name as created_by,
      bat.updated_at,
      us2.full_name as updated_by
    FROM interview.batch bat
    INNER JOIN interview.work_order wo ON (bat.work_order_id = wo.id)
    INNER JOIN interview.product prd ON (wo.product_id = prd.id)
    LEFT JOIN auth."user" emp ON (bat.assigned_employee_id = emp.id)
    INNER JOIN auth."user" us1 ON (bat.created_by = us1.id)
    LEFT JOIN auth."user" us2 ON (bat.updated_by = us2.id)
    WHERE bat.id = $1
      AND bat.entity_id = $2
      AND bat.plant_id = $3
    `

  const bind = [batchId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByWorkOrderId = async (context, entityId, plantId, workOrderId, client = null) => {
  const query = `
    SELECT 
      bat.id,
      bat.code,
      prd.code as product_code,
      prd."name" as product_name,
      bat.work_order_id,
      wo.code as work_order_code,
      wo.product_id,
      bat.assigned_employee_id,
      emp.full_name as assigned_employee_name,
      bat.status,
      bat.quantity,
      bat.planned_start,
      bat.planned_end,
      bat.actual_start,
      bat.actual_end,
      bat.created_at,
      us1.full_name as created_by,
      bat.updated_at,
      us2.full_name as updated_by
    FROM interview.batch bat
    JOIN interview.work_order wo ON (bat.work_order_id = wo.id)
    INNER JOIN interview.product prd ON (wo.product_id = prd.id)
    LEFT JOIN auth.user emp ON (bat.assigned_employee_id = emp.id)
    INNER JOIN auth.user us1 ON (bat.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bat.updated_by = us2.id)
    WHERE bat.work_order_id = $1
    AND bat.entity_id = $2
    AND bat.plant_id = $3
    ORDER BY bat.created_at DESC`

  const bind = [workOrderId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      bat.id,
      bat.code,
      prd.code as product_code,
      prd."name" as product_name,
      bat.work_order_id,
      wo.code as work_order_code,
      wo.product_id,
      bat.assigned_employee_id,
      emp.full_name as assigned_employee_name,
      bat.status,
      bat.quantity,
      bat.planned_start,
      bat.planned_end,
      bat.actual_start,
      bat.actual_end,
      bat.created_at,
      us1.full_name as created_by,
      bat.updated_at,
      us2.full_name as updated_by
    FROM interview.batch bat
    LEFT JOIN interview.work_order wo ON (bat.work_order_id = wo.id)
    INNER JOIN interview.product prd ON (wo.product_id = prd.id)
    LEFT JOIN auth.user emp ON (bat.assigned_employee_id = emp.id)
    INNER JOIN auth.user us1 ON (bat.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bat.updated_by = us2.id)
    WHERE 1=1
      AND (
        bat.code ILIKE concat('%', concat($1::varchar, '%')) OR
        prd."name" ILIKE concat('%', concat($2::varchar, '%')) OR
        prd.code ILIKE concat('%', concat($3::varchar, '%')) OR
        wo.code ILIKE concat('%', concat($4::varchar, '%'))
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

const create = async (context, entityId, plantId, id, code, workOrderId, assignedEmployeeId, status, quantity, plannedStart, plannedEnd, routingId, bomId, requiresQualityControl, client = null) => {
  const query = `
    INSERT INTO interview.batch
    (id, code, work_order_id, assigned_employee_id, status, quantity, planned_start, 
    planned_end, created_by, created_at, routing_id, bill_of_materials_id, entity_id, plant_id, requires_quality_control)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
  `
  const bind = [
    id,
    code,
    workOrderId || null,
    assignedEmployeeId || null,
    status || 'PENDING',
    quantity,
    plannedStart || null,
    plannedEnd || null,
    context.session.userId,
    timestamp(),
    routingId,
    bomId,
    entityId,
    plantId,
    requiresQualityControl
  ]

  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, batchId, code, workOrderId, assignedEmployeeId, status, quantity, plannedStart, plannedEnd, actualStart, actualEnd, routingId, bomId, client = null) => {
  const query = `
      UPDATE interview.batch
      SET
        code = $1,
        work_order_id = $2,
        assigned_employee_id = $3,
        status = $4,
        quantity = $5,
        planned_start = $6,
        planned_end = $7,
        actual_start = $8,
        actual_end = $9,
        updated_by = $10,
        updated_at = $11,
        routing_id = $12,
        bill_of_material_id = $13
      WHERE id = $14
      RETURNING id
    `
  const bind = [
    code,
    workOrderId || null,
    assignedEmployeeId || null,
    status || 'PENDING',
    quantity,
    plannedStart || null,
    plannedEnd || null,
    actualStart || null,
    actualEnd || null,
    context.session.userId,
    timestamp(),
    routingId,
    bomId,
    batchId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const deleteById = async (context, entityId, plantId, batchId, client = null) => {
  const query = `
    DELETE FROM interview.batch
    WHERE id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [batchId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (client = null) => {
  const query = `
    SELECT 
      bat.id,
      bat.code,
      prd.code as product_code,
      prd."name" as product_name,
      bat.work_order_id,
      bat.status,
      bat.quantity
    FROM interview.batch bat
    INNER JOIN interview.product prd ON (bat.product_id = prd.id)
    ORDER BY bat.created_at DESC
  `

  const response = await db.query(query, [], client)

  return response
}

const updateStatus = async (context, entityId, plantId, batchId, status, client = null) => {
  const query = `
    UPDATE interview.batch
    SET
      status = $1,
      updated_at = $2,
      updated_by = $3
    WHERE id = $4
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [status, timestamp(), context.session.userId, batchId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const setStartTime = async (context, entityId, plantId, batchId, actualStart, client = null) => {
  const query = `
    UPDATE interview.batch
    SET
      actual_start = $1,
      updated_at = $2,
      updated_by = $3
    WHERE id = $4
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [actualStart, timestamp(), context.session.userId, batchId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const setEndTime = async (context, entityId, plantId, batchId, actualEnd, client = null) => {
  const query = `
    UPDATE interview.batch
    SET
      actual_end = $1,
      updated_at = $2,
      updated_by = $3
    WHERE id = $4
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [actualEnd, timestamp(), context.session.userId, batchId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

export const batchRepository = {
  ...baseRepository,
  findById,
  findByWorkOrderId,
  tablePaginated,
  create,
  update,
  deleteById,
  listAll,
  updateStatus,
  setStartTime,
  setEndTime
}
