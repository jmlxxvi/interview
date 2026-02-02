import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.inventory_reservation')

const findById = async (context, entityId, plantId, reservationId, client = null) => {
  const query = `
    SELECT 
      ire.id,
      ire.inventory_item_id,
      ire.batch_id,
      bat.code as batch_code,
      ire.quantity,
      ire.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      ire.reserved_at,
      ire.reserved_by,
      us1.full_name as reserved_by_name,
      ire.released_at,
      ire.released_by,
      us2.full_name as released_by_name,
      ire.status,
      ire.notes,
      iit.product_id,
      prd.code as product_code,
      prd.name as product_name,
      iit.lot_id,
      lot.code as lot_code,
      iit.location_id,
      loc.code as location_code,
      loc.name as location_name
    FROM interview.inventory_reservation ire
    INNER JOIN interview.inventory_item iit ON (ire.inventory_item_id = iit.id)
    INNER JOIN interview.product prd ON (iit.product_id = prd.id)
    INNER JOIN interview.batch bat ON (ire.batch_id = bat.id)
    LEFT JOIN interview.unit_of_measure uom ON (ire.unit_of_measure_id = uom.id)
    LEFT JOIN interview.lot lot ON (iit.lot_id = lot.id)
    INNER JOIN interview.inventory_location loc ON (iit.location_id = loc.id)
    LEFT JOIN auth.user us1 ON (ire.reserved_by = us1.id)
    LEFT JOIN auth.user us2 ON (ire.released_by = us2.id)
    WHERE ire.id = $1
    -- Entity and Plant filtering
      AND ire.entity_id = $2
      AND ire.plant_id = $3
      AND iit.entity_id = $2
      AND iit.plant_id = $3
      AND bat.entity_id = $2
      AND bat.plant_id = $3
      AND (us1.entity_id = $2 OR us1.entity_id IS NULL)
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
  `

  const bind = [reservationId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByBatchId = async (context, entityId, plantId, batchId, client = null) => {
  const query = `
    SELECT 
      ire.id,
      ire.inventory_item_id,
      ire.batch_id,
      bat.code as batch_code,
      ire.quantity,
      ire.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      ire.reserved_at,
      ire.reserved_by,
      us1.full_name as reserved_by_name,
      ire.released_at,
      ire.released_by,
      us2.full_name as released_by_name,
      ire.status,
      ire.notes,
      iit.product_id,
      prd.code as product_code,
      prd.name as product_name,
      iit.lot_id,
      lot.code as lot_code,
      iit.location_id,
      loc.code as location_code,
      loc.name as location_name
    FROM interview.inventory_reservation ire
    INNER JOIN interview.inventory_item iit ON (ire.inventory_item_id = iit.id)
    INNER JOIN interview.product prd ON (iit.product_id = prd.id)
    INNER JOIN interview.batch bat ON (ire.batch_id = bat.id)
    LEFT JOIN interview.unit_of_measure uom ON (ire.unit_of_measure_id = uom.id)
    LEFT JOIN interview.lot lot ON (iit.lot_id = lot.id)
    INNER JOIN interview.inventory_location loc ON (iit.location_id = loc.id)
    LEFT JOIN auth.user us1 ON (ire.reserved_by = us1.id)
    LEFT JOIN auth.user us2 ON (ire.released_by = us2.id)
    WHERE ire.batch_id = $1
    -- Entity and Plant filtering
      AND ire.entity_id = $2
      AND ire.plant_id = $3
      AND iit.entity_id = $2
      AND iit.plant_id = $3
      AND bat.entity_id = $2
      AND bat.plant_id = $3
      AND (us1.entity_id = $2 OR us1.entity_id IS NULL)
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
    ORDER BY ire.reserved_at DESC
  `

  const bind = [batchId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const findByInventoryItem = async (context, entityId, plantId, inventoryItemId, client = null) => {
  const query = `
    SELECT 
      ire.id,
      ire.inventory_item_id,
      ire.batch_id,
      bat.code as batch_code,
      ire.quantity,
      ire.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      ire.reserved_at,
      ire.reserved_by,
      us1.full_name as reserved_by_name,
      ire.released_at,
      ire.released_by,
      us2.full_name as released_by_name,
      ire.status,
      ire.notes
    FROM interview.inventory_reservation ire
    INNER JOIN interview.batch bat ON (ire.batch_id = bat.id)
    LEFT JOIN interview.unit_of_measure uom ON (ire.unit_of_measure_id = uom.id)
    LEFT JOIN auth.user us1 ON (ire.reserved_by = us1.id)
    LEFT JOIN auth.user us2 ON (ire.released_by = us2.id)
    WHERE ire.inventory_item_id = $1
    -- Entity and Plant filtering
      AND ire.entity_id = $2
      AND ire.plant_id = $3
      AND bat.entity_id = $2
      AND bat.plant_id = $3
      AND (us1.entity_id = $2 OR us1.entity_id IS NULL)
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
    ORDER BY ire.reserved_at DESC
  `

  const bind = [inventoryItemId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

// TODO add vendorId filter
const findByProduct = async (context, entityId, plantId, productId, vendorId, client = null) => {
  const query = `
    SELECT 
      ire.id,
      ire.inventory_item_id,
      ire.batch_id,
      bat.code as batch_code,
      ire.quantity,
      ire.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      ire.reserved_at,
      ire.reserved_by,
      us1.full_name as reserved_by_name,
      ire.released_at,
      ire.released_by,
      us2.full_name as released_by_name,
      ire.status,
      ire.notes,
      iit.product_id,
      prd.code as product_code,
      prd.name as product_name,
      iit.lot_id,
      lot.code as lot_code,
      iit.location_id,
      loc.code as location_code,
      loc.name as location_name
    FROM interview.inventory_reservation ire
    INNER JOIN interview.inventory_item iit ON (ire.inventory_item_id = iit.id)
    INNER JOIN interview.product prd ON (iit.product_id = prd.id)
    INNER JOIN interview.batch bat ON (ire.batch_id = bat.id)
    LEFT JOIN interview.unit_of_measure uom ON (ire.unit_of_measure_id = uom.id)
    LEFT JOIN interview.lot lot ON (iit.lot_id = lot.id)
    INNER JOIN interview.inventory_location loc ON (iit.location_id = loc.id)
    LEFT JOIN auth.user us1 ON (ire.reserved_by = us1.id)
    LEFT JOIN auth.user us2 ON (ire.released_by = us2.id)
    WHERE iit.product_id = $1
    -- Entity and Plant filtering
      AND ire.entity_id = $2
      AND ire.plant_id = $3
      AND iit.entity_id = $2
      AND iit.plant_id = $3
      AND bat.entity_id = $2
      AND bat.plant_id = $3
      AND (us1.entity_id = $2 OR us1.entity_id IS NULL)
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
    ORDER BY ire.reserved_at DESC
  `

  const bind = [productId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      ire.id,
      ire.inventory_item_id,
      ire.batch_id,
      bat.code as batch_code,
      bat.work_order_id,
      wor.code as work_order_code,
      ire.quantity,
      ire.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      ire.reserved_at,
      ire.reserved_by,
      us1.full_name as reserved_by_name,
      ire.released_at,
      ire.released_by,
      us2.full_name as released_by_name,
      ire.status,
      ire.notes,
      iit.product_id,
      prd.code as product_code,
      prd.name as product_name,
      iit.lot_id,
      lot.code as lot_code,
      iit.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      iit.location_id,
      loc.code as location_code,
      loc.name as location_name
    FROM interview.inventory_reservation ire
    INNER JOIN interview.inventory_item iit ON (ire.inventory_item_id = iit.id)
    INNER JOIN interview.product prd ON (iit.product_id = prd.id)
    INNER JOIN interview.batch bat ON (ire.batch_id = bat.id)
    LEFT JOIN interview.work_order wor ON (bat.work_order_id = wor.id)
    LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
    LEFT JOIN interview.lot lot ON (iit.lot_id = lot.id)
    LEFT JOIN interview.vendor ven ON (iit.vendor_id = ven.id)
    INNER JOIN interview.inventory_location loc ON (iit.location_id = loc.id)
    LEFT JOIN auth.user us1 ON (ire.reserved_by = us1.id)
    LEFT JOIN auth.user us2 ON (ire.released_by = us2.id)
    WHERE 1=1
      AND (
        bat.code ILIKE concat('%', concat($1::varchar, '%')) OR
        prd.code ILIKE concat('%', concat($2::varchar, '%')) OR
        prd.name ILIKE concat('%', concat($3::varchar, '%'))
      )
    -- Entity and Plant filtering
      AND ire.entity_id = $4
      AND ire.plant_id = $5
      AND iit.entity_id = $4
      AND iit.plant_id = $5
      AND bat.entity_id = $4
      AND bat.plant_id = $5
      AND (wor.entity_id = $4 OR wor.entity_id IS NULL)
      AND (us1.entity_id = $4 OR us1.entity_id IS NULL)
      AND (us2.entity_id = $4 OR us2.entity_id IS NULL)
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

const create = async (context, entityId, plantId, id, inventoryItemId, batchId, quantity, unitOfMeasureId, reservedBy, notes, client = null) => {
  const query = `
    INSERT INTO interview.inventory_reservation
    (id, inventory_item_id, batch_id, quantity, unit_of_measure_id, reserved_at, reserved_by, status, notes, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'RESERVED', $8, $9, $10)
    RETURNING id
  `
  const bind = [
    id,
    inventoryItemId,
    batchId,
    quantity,
    unitOfMeasureId || null,
    timestamp(),
    reservedBy || context.session.userId,
    notes || null,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const updateStatus = async (context, entityId, plantId, reservationId, status, client = null) => {
  console.log('entityId, plantId, reservationId, status: ', entityId, plantId, reservationId, status)
  const query = `
    UPDATE interview.inventory_reservation
    SET
      status = $1,
      released_at = CASE WHEN $1::varchar IN ('RELEASED', 'CONSUMED', 'CANCELLED') THEN $2 ELSE released_at END,
      released_by = CASE WHEN $1::varchar IN ('RELEASED', 'CONSUMED', 'CANCELLED') THEN $3 ELSE released_by END
    WHERE id = $4
    -- Entity and Plant filtering
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [status, timestamp(), context.session.userId, reservationId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const release = async (context, entityId, plantId, reservationId, client = null) => {
  return updateStatus(context, entityId, plantId, reservationId, 'RELEASED', client)
}

const consume = async (context, entityId, plantId, reservationId, client = null) => {
  return updateStatus(context, entityId, plantId, reservationId, 'CONSUMED', client)
}

const cancel = async (context, entityId, plantId, reservationId, client = null) => {
  return updateStatus(context, entityId, plantId, reservationId, 'CANCELLED', client)
}

const update = async (context, entityId, plantId, reservationId, quantity, unitOfMeasureId, status, notes, client = null) => {
  const query = `
    UPDATE interview.inventory_reservation
    SET
      quantity = $1,
      unit_of_measure_id = $2,
      status = $3,
      notes = $4,
      released_at = CASE WHEN $3 IN ('RELEASED', 'CONSUMED', 'CANCELLED') AND released_at IS NULL THEN $5 ELSE released_at END,
      released_by = CASE WHEN $3 IN ('RELEASED', 'CONSUMED', 'CANCELLED') AND released_by IS NULL THEN $6 ELSE released_by END
    WHERE id = $7
    -- Entity and Plant filtering
      AND entity_id = $8
      AND plant_id = $9
    RETURNING id
  `
  const bind = [
    quantity,
    unitOfMeasureId || null,
    status,
    notes || null,
    timestamp(),
    context.session.userId,
    reservationId,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const removeById = async (context, entityId, plantId, reservationId, client = null) => {
  const query = `
    DELETE FROM interview.inventory_reservation
    WHERE id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [reservationId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const removeByBatch = async (context, entityId, plantId, batchId, client = null) => {
  const query = `
    DELETE FROM interview.inventory_reservation
    WHERE batch_id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [batchId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      ire.id,
      ire.inventory_item_id,
      ire.batch_id,
      bat.code as batch_code,
      ire.quantity,
      ire.status,
      prd.code as product_code,
      prd.name as product_name
    FROM interview.inventory_reservation ire
    INNER JOIN interview.inventory_item iit ON (ire.inventory_item_id = iit.id)
    INNER JOIN interview.product prd ON (iit.product_id = prd.id)
    INNER JOIN interview.batch bat ON (ire.batch_id = bat.id)
    -- Entity and Plant filtering
    WHERE ire.entity_id = $1
      AND ire.plant_id = $2
    ORDER BY ire.reserved_at DESC
  `

  const response = await db.query(query, [entityId, plantId], client)

  return response
}

const getActiveReservations = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      ire.id,
      ire.inventory_item_id,
      ire.batch_id,
      bat.code as batch_code,
      ire.quantity,
      ire.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      ire.reserved_at,
      ire.reserved_by,
      us1.full_name as reserved_by_name,
      ire.status,
      ire.notes,
      iit.product_id,
      prd.code as product_code,
      prd.name as product_name,
      iit.lot_id,
      lot.code as lot_code
    FROM interview.inventory_reservation ire
    INNER JOIN interview.inventory_item iit ON (ire.inventory_item_id = iit.id)
    INNER JOIN interview.product prd ON (iit.product_id = prd.id)
    INNER JOIN interview.batch bat ON (ire.batch_id = bat.id)
    LEFT JOIN interview.unit_of_measure uom ON (ire.unit_of_measure_id = uom.id)
    LEFT JOIN interview.lot lot ON (iit.lot_id = lot.id)
    LEFT JOIN auth.user us1 ON (ire.reserved_by = us1.id)
    WHERE ire.status = 'RESERVED'
    -- Entity and Plant filtering
      AND ire.entity_id = $1
      AND ire.plant_id = $2
      AND iit.entity_id = $1
      AND iit.plant_id = $2
      AND bat.entity_id = $1
      AND bat.plant_id = $2
      AND (us1.entity_id = $1 OR us1.entity_id IS NULL)
    ORDER BY ire.reserved_at ASC
  `

  const response = await db.query(query, [entityId, plantId], client)

  return response
}

export const inventoryReservationRepository = {
  ...baseRepository,
  findById,
  findByBatchId,
  findByInventoryItem,
  findByProduct,
  tablePaginated,
  create,
  update,
  updateStatus,
  release,
  consume,
  cancel,
  removeById,
  removeByBatch,
  listAll,
  getActiveReservations
}
