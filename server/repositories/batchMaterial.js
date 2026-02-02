import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.batch_material')

const findById = async (batchMaterialId, client = null) => {
  const query = `
    SELECT 
      bma.id,
      bma.batch_id,
      bat.code as batch_code,
      bma.bill_of_materials_item_id,
      bma.component_id,
      comp.code as component_code,
      comp."name" as component_name,
      bma.quantity,
      bma.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom."name" as unit_of_measure_name,
      bma.vendor_id,
      ven.code as vendor_code,
      ven."name" as vendor_name,
      bma.status,
      bma.notes,
      bma.created_at,
      us1.full_name as created_by,
      bma.updated_at,
      us2.full_name as updated_by
    FROM interview.batch_material bma
    INNER JOIN interview.batch bat ON (bma.batch_id = bat.id)
    INNER JOIN interview.product comp ON (bma.component_id = comp.id)
    INNER JOIN interview.unit_of_measure uom ON (bma.unit_of_measure_id = uom.id)
    INNER JOIN interview.vendor ven ON (bma.vendor_id = ven.id)
    INNER JOIN auth.user us1 ON (bma.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bma.updated_by = us2.id)
    WHERE bma.id = $1`

  const bind = [batchMaterialId]

  const response = await db.row(query, bind, client)

  return response
}

const findByBatchId = async (batchId, client = null) => {
  const query = `
    SELECT 
      bma.id,
      bma.batch_id,
      bat.code as batch_code,
      bma.bill_of_materials_item_id,
      bma.component_id,
      comp.code as component_code,
      comp."name" as component_name,
      bma.quantity,
      bma.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom."name" as unit_of_measure_name,
      bma.vendor_id,
      ven.code as vendor_code,
      ven."name" as vendor_name,
      bma.status,
      bma.notes,
      bma.created_at,
      us1.full_name as created_by,
      bma.updated_at,
      us2.full_name as updated_by
    FROM interview.batch_material bma
    INNER JOIN interview.batch bat ON (bma.batch_id = bat.id)
    INNER JOIN interview.product comp ON (bma.component_id = comp.id)
    INNER JOIN interview.unit_of_measure uom ON (bma.unit_of_measure_id = uom.id)
    INNER JOIN interview.vendor ven ON (bma.vendor_id = ven.id)
    INNER JOIN auth.user us1 ON (bma.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bma.updated_by = us2.id)
    WHERE bma.batch_id = $1
    ORDER BY comp.name ASC`

  const bind = [batchId]

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      bma.id,
      bma.batch_id,
      bat.code as batch_code,
      bma.bill_of_materials_item_id,
      bma.component_id,
      comp.code as component_code,
      comp."name" as component_name,
      bma.quantity,
      bma.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom."name" as unit_of_measure_name,
      bma.vendor_id,
      ven.code as vendor_code,
      ven."name" as vendor_name,
      bma.status,
      bma.notes,
      bma.created_at,
      us1.full_name as created_by,
      bma.updated_at,
      us2.full_name as updated_by
    FROM interview.batch_material bma
    INNER JOIN interview.batch bat ON (bma.batch_id = bat.id)
    INNER JOIN interview.product comp ON (bma.component_id = comp.id)
    INNER JOIN interview.unit_of_measure uom ON (bma.unit_of_measure_id = uom.id)
    INNER JOIN interview.vendor ven ON (bma.vendor_id = ven.id)
    INNER JOIN auth.user us1 ON (bma.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (bma.updated_by = us2.id)
    WHERE 1=1
      AND (
        bat.code ILIKE concat('%', concat($1::varchar, '%')) OR
        comp."name" ILIKE concat('%', concat($2::varchar, '%')) OR
        comp.code ILIKE concat('%', concat($3::varchar, '%')) OR
        ven."name" ILIKE concat('%', concat($4::varchar, '%'))
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

const create = async (context, entityId, plantId, id, batchId, billOfMaterialsItemId, componentId, quantity, unitOfMeasureId, vendorId, status, notes, client = null) => {
  const query = `
    INSERT INTO interview.batch_material
    (id, batch_id, bill_of_materials_item_id, component_id, quantity, unit_of_measure_id, 
    vendor_id, status, notes, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `
  const bind = [
    id,
    batchId,
    billOfMaterialsItemId,
    componentId,
    quantity,
    unitOfMeasureId,
    vendorId,
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

const update = async (context, batchMaterialId, batchId, billOfMaterialsItemId, componentId, quantity, unitOfMeasureId, vendorId, status, notes, client = null) => {
  const query = `
    UPDATE interview.batch_material
    SET
      batch_id = $1,
      bill_of_materials_item_id = $2,
      component_id = $3,
      quantity = $4,
      unit_of_measure_id = $5,
      vendor_id = $6,
      status = $7,
      notes = $8,
      updated_by = $9,
      updated_at = $10
    WHERE id = $11
    RETURNING id
  `
  const bind = [
    batchId,
    billOfMaterialsItemId,
    componentId,
    quantity,
    unitOfMeasureId,
    vendorId,
    status || 'PENDING',
    notes || null,
    context.session.userId,
    timestamp(),
    batchMaterialId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const deleteById = async (batchMaterialId, client = null) => {
  const query = `
    DELETE FROM interview.batch_material
    WHERE id = $1
    RETURNING id
  `
  const bind = [batchMaterialId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (client = null) => {
  const query = `
    SELECT 
      bma.id,
      bma.batch_id,
      bat.code as batch_code,
      bma.component_id,
      comp.code as component_code,
      comp."name" as component_name,
      bma.quantity,
      bma.status
    FROM interview.batch_material bma
    INNER JOIN interview.batch bat ON (bma.batch_id = bat.id)
    INNER JOIN interview.product comp ON (bma.component_id = comp.id)
    ORDER BY bma.batch_id, comp.name
  `

  const response = await db.query(query, [], client)

  return response
}

export const batchMaterialRepository = {
  ...baseRepository,
  findById,
  findByBatchId,
  tablePaginated,
  create,
  update,
  deleteById,
  listAll
}
