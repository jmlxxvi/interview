import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.material_request')

// ===================================
// MATERIAL REQUEST FUNCTIONS
// ===================================

const findById = async (context, entityId, plantId, materialRequestId, client = null) => {
  const query = `
    SELECT 
      mr.id,
      mr.work_order_id,
      wo.code as work_order_code,
      mr.requested_by,
      usr1.full_name as requested_by_name,
      mr.requested_at,
      mr.due_date,
      mr.assigned_to,
      usr2.full_name as assigned_to_name,
      mr.priority,
      mr.status,
      mr.notes,
      mr.destination_location_id,
      loc.code as destination_location_code,
      loc.name as destination_location_name,
      mr.created_at,
      mr.updated_at
    FROM interview.material_request mr
    INNER JOIN interview.work_order wo ON (mr.work_order_id = wo.id)
    INNER JOIN auth.user usr1 ON (mr.requested_by = usr1.id)
    LEFT JOIN auth.user usr2 ON (mr.assigned_to = usr2.id)
    LEFT JOIN interview.inventory_location loc ON (mr.destination_location_id = loc.id)
    WHERE mr.id = $1
      AND mr.entity_id = $2
      AND mr.plant_id = $3
  `
  const bind = [materialRequestId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByWorkOrderId = async (context, entityId, plantId, workOrderId, client = null) => {
  const query = `
    SELECT 
      mr.id,
      mr.work_order_id,
      wo.code as work_order_code,
      mr.requested_by,
      usr1.full_name as requested_by_name,
      mr.requested_at,
      mr.due_date,
      mr.assigned_to,
      usr2.full_name as assigned_to_name,
      mr.priority,
      mr.status,
      mr.notes,
      mr.destination_location_id,
      loc.code as destination_location_code,
      loc.name as destination_location_name,
      mr.created_at,
      mr.updated_at
    FROM interview.material_request mr
    INNER JOIN interview.work_order wo ON (mr.work_order_id = wo.id)
    INNER JOIN auth.user usr1 ON (mr.requested_by = usr1.id)
    LEFT JOIN auth.user usr2 ON (mr.assigned_to = usr2.id)
    LEFT JOIN interview.inventory_location loc ON (mr.destination_location_id = loc.id)
    WHERE mr.work_order_id = $1
      AND mr.entity_id = $2
      AND mr.plant_id = $3
    ORDER BY mr.requested_at DESC
  `
  const bind = [workOrderId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      mr.id,
      mr.work_order_id,
      wo.code as work_order_code,
      mr.requested_by,
      usr1.full_name as requested_by_name,
      mr.requested_at,
      mr.due_date,
      mr.assigned_to,
      usr2.full_name as assigned_to_name,
      mr.priority,
      mr.status,
      mr.notes,
      mr.destination_location_id,
      loc.code as destination_location_code,
      loc.name as destination_location_name
    FROM interview.material_request mr
    INNER JOIN interview.work_order wo ON (mr.work_order_id = wo.id)
    INNER JOIN auth.user usr1 ON (mr.requested_by = usr1.id)
    LEFT JOIN auth.user usr2 ON (mr.assigned_to = usr2.id)
    LEFT JOIN interview.inventory_location loc ON (mr.destination_location_id = loc.id)
    WHERE 1=1
      AND mr.entity_id = $4
      AND mr.plant_id = $5
      AND (
        wo.code ILIKE concat('%', concat($1::varchar, '%')) OR
        usr1.full_name ILIKE concat('%', concat($2::varchar, '%')) OR
        mr.notes ILIKE concat('%', concat($3::varchar, '%'))
      )
    ORDER BY ${orderCol} ${orderDir}
  `
  const bind = [search, search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, id, workOrderId, requestedBy, requestedAt, dueDate, assignedTo, priority, status, notes, destinationLocationId, client = null) => {
  const query = `
    INSERT INTO interview.material_request
    (id, work_order_id, requested_by, requested_at, due_date, assigned_to, priority, status, notes, destination_location_id, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `
  const bind = [
    id,
    workOrderId,
    requestedBy,
    requestedAt || timestamp(),
    dueDate || null,
    assignedTo || null,
    priority || 'NORMAL',
    status || 'PENDING',
    notes || null,
    destinationLocationId || null,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, materialRequestId, dueDate, assignedTo, priority, status, notes, destinationLocationId, client = null) => {
  const query = `
    UPDATE interview.material_request
    SET
      due_date = $1,
      assigned_to = $2,
      priority = $3,
      status = $4,
      notes = $5,
      destination_location_id = $6
    WHERE id = $7
      AND entity_id = $8
      AND plant_id = $9
    RETURNING id
  `
  const bind = [
    dueDate || null,
    assignedTo || null,
    priority || 'NORMAL',
    status || 'PENDING',
    notes || null,
    destinationLocationId || null,
    materialRequestId,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const updateStatus = async (context, entityId, plantId, materialRequestId, status, client = null) => {
  const query = `
    UPDATE interview.material_request
    SET status = $1
    WHERE id = $2
      AND entity_id = $3
      AND plant_id = $4
    RETURNING id
  `
  const bind = [status, materialRequestId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const deleteById = async (context, entityId, plantId, materialRequestId, client = null) => {
  const query = `
    DELETE FROM interview.material_request
    WHERE id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [materialRequestId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

// ===================================
// MATERIAL REQUEST ITEM FUNCTIONS
// ===================================

const findItemById = async (context, entityId, plantId, materialRequestItemId, client = null) => {
  const query = `
    SELECT 
      mri.id,
      mri.material_request_id,
      mri.inventory_item_id,
      mri.material_id,
      prd.code as material_code,
      prd.name as material_name,
      mri.lot_id,
      lot.code as lot_code,
      mri.quantity,
      mri.unit_of_measure,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      mri.status
    FROM interview.material_request_item mri
    INNER JOIN interview.product prd ON (mri.material_id = prd.id)
    LEFT JOIN interview.lot lot ON (mri.lot_id = lot.id)
    INNER JOIN interview.unit_of_measure uom ON (mri.unit_of_measure = uom.id)
    WHERE mri.id = $1
      AND mri.entity_id = $2
      AND mri.plant_id = $3
  `
  const bind = [materialRequestItemId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findItemsByRequestId = async (context, entityId, plantId, materialRequestId, client = null) => {
  const query = `
    SELECT 
      mri.id,
      mri.material_request_id,
      mri.inventory_item_id,
      mri.material_id,
      prd.code as material_code,
      prd.name as material_name,
      mri.lot_id,
      lot.code as lot_code,
      mri.quantity,
      mri.unit_of_measure,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      mri.status
    FROM interview.material_request_item mri
    INNER JOIN interview.product prd ON (mri.material_id = prd.id)
    LEFT JOIN interview.lot lot ON (mri.lot_id = lot.id)
    INNER JOIN interview.unit_of_measure uom ON (mri.unit_of_measure = uom.id)
    WHERE mri.material_request_id = $1
      AND mri.entity_id = $2
      AND mri.plant_id = $3
    ORDER BY prd.name ASC
  `
  const bind = [materialRequestId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const createItem = async (context, entityId, plantId, id, materialRequestId, inventoryItemId, materialId, lotId, quantity, unitOfMeasure, status, client = null) => {
  const query = `
    INSERT INTO interview.material_request_item
    (id, material_request_id, inventory_item_id, material_id, lot_id, quantity, unit_of_measure, status, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `
  const bind = [
    id,
    materialRequestId,
    inventoryItemId || null,
    materialId,
    lotId || null,
    quantity,
    unitOfMeasure,
    status || 'PENDING',
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const updateItem = async (context, entityId, plantId, materialRequestItemId, inventoryItemId, lotId, quantity, unitOfMeasure, status, client = null) => {
  const query = `
    UPDATE interview.material_request_item
    SET
      inventory_item_id = $1,
      lot_id = $2,
      quantity = $3,
      unit_of_measure = $4,
      status = $5
    WHERE id = $6
      AND entity_id = $7
      AND plant_id = $8
    RETURNING id
  `
  const bind = [
    inventoryItemId || null,
    lotId || null,
    quantity,
    unitOfMeasure,
    status || 'PENDING',
    materialRequestItemId,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const updateItemStatus = async (context, entityId, plantId, materialRequestItemId, status, client = null) => {
  const query = `
    UPDATE interview.material_request_item
    SET status = $1
    WHERE id = $2
      AND entity_id = $3
      AND plant_id = $4
    RETURNING id
  `
  const bind = [status, materialRequestItemId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const deleteItemById = async (context, entityId, plantId, materialRequestItemId, client = null) => {
  const query = `
    DELETE FROM interview.material_request_item
    WHERE id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [materialRequestItemId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const deleteItemsByRequestId = async (context, entityId, plantId, materialRequestId, client = null) => {
  const query = `
    DELETE FROM interview.material_request_item
    WHERE material_request_id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [materialRequestId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

// Get request with items (complete view)
const getRequestWithItems = async (context, entityId, plantId, materialRequestId, client = null) => {
  const query = `
    SELECT
      jsonb_build_object(
        'id', mr.id,
        'workOrderId', mr.work_order_id,
        'workOrderCode', wo.code,
        'requestedBy', mr.requested_by,
        'requestedByName', usr1.full_name,
        'requestedAt', mr.requested_at,
        'dueDate', mr.due_date,
        'assignedTo', mr.assigned_to,
        'assignedToName', usr2.full_name,
        'priority', mr.priority,
        'status', mr.status,
        'notes', mr.notes,
        'destinationLocationId', mr.destination_location_id,
        'destinationLocationCode', loc.code,
        'destinationLocationName', loc.name
      ) as request,
      COALESCE(
        json_agg(
          jsonb_build_object(
            'id', mri.id,
            'materialRequestId', mri.material_request_id,
            'inventoryItemId', mri.inventory_item_id,
            'materialId', mri.material_id,
            'materialCode', prd.code,
            'materialName', prd.name,
            'lotId', mri.lot_id,
            'lotCode', lot.code,
            'quantity', mri.quantity,
            'unitOfMeasureId', mri.unit_of_measure,
            'unitOfMeasureCode', uom.code,
            'unitOfMeasureName', uom.name,
            'status', mri.status
          ) ORDER BY prd.name ASC
        ) FILTER (WHERE mri.id IS NOT NULL),
        '[]'::json
      ) as items
    FROM interview.material_request mr
    INNER JOIN interview.work_order wo ON (mr.work_order_id = wo.id)
    INNER JOIN auth.user usr1 ON (mr.requested_by = usr1.id)
    LEFT JOIN auth.user usr2 ON (mr.assigned_to = usr2.id)
    LEFT JOIN interview.inventory_location loc ON (mr.destination_location_id = loc.id)
    LEFT JOIN interview.material_request_item mri ON (mr.id = mri.material_request_id)
    LEFT JOIN interview.product prd ON (mri.material_id = prd.id)
    LEFT JOIN interview.lot lot ON (mri.lot_id = lot.id)
    LEFT JOIN interview.unit_of_measure uom ON (mri.unit_of_measure = uom.id)
    WHERE mr.id = $1
      AND mr.entity_id = $2
      AND mr.plant_id = $3
    GROUP BY
      mr.id, wo.code, usr1.full_name, usr2.full_name, loc.code, loc.name
  `
  const bind = [materialRequestId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

export const materialRequestRepository = {
  ...baseRepository,
  // Material Request functions
  findById,
  findByWorkOrderId,
  tablePaginated,
  create,
  update,
  updateStatus,
  deleteById,
  // Material Request Item functions
  findItemById,
  findItemsByRequestId,
  createItem,
  updateItem,
  updateItemStatus,
  deleteItemById,
  deleteItemsByRequestId,
  // Combined functions
  getRequestWithItems
}
