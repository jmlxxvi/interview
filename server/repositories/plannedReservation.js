import { db } from '../platform/db/index.js'
import { timestamp, uuid } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.planned_reservation')

export async function createPlannedReservation (context, entityId, plantId, batchId, plannedSupplyId, reservedQuantity, client = null) {
  console.log('createPlannedReservation.batchId, plannedSupplyId, reservedQuantity: ', batchId, plannedSupplyId, reservedQuantity)
  console.log('reservedQuantity: ', reservedQuantity)
  const response = await db.query(
      `INSERT INTO interview.planned_reservation (id, batch_id, planned_supply_id, quantity, reserved_at, reserved_by, status, entity_id, plant_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'RESERVED', $7, $8)
       RETURNING *`,
      [uuid(), batchId, plannedSupplyId, reservedQuantity, timestamp(), context.session.userId, entityId, plantId],
      client
  )
  return response
}

export async function findPlannedReservationsForWorkOrder (context, entityId, plantId, workOrderId, client = null) {
  const response = await db.query(
    `SELECT r.*, ps.expected_date, ps.product_id
     FROM interview.planned_reservation r
     JOIN interview.planned_supply ps ON ps.id = r.planned_supply_id
     WHERE r.work_order_id = $1
       AND r.entity_id = $2
       AND r.plant_id = $3
     ORDER BY ps.expected_date`,
    [workOrderId, entityId, plantId],
    client
  )
  return response
}

// TODO this is not finished
export async function findByProduct (context, entityId, plantId, productId, vendorId, client = null) {
  console.log('findByProductentityId, plantId, productId, vendorId: ', entityId, plantId, productId, vendorId)
  const query = `SELECT 
      pr.id,
      pr.batch_id,
      bat.code as batch_code,
      ps.id as planned_supply_id,
      ps.product_id,
      prd.code as product_code,
      prd.name as product_name,
      ps.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      pr.reserved_quantity,
      ps.quantity,
      pr.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      pr.reserved_at,
      pr.reserved_by,
      us1.full_name as reserved_by_name,
      pr.status,
      ps.source_type,
      ps.source_code,
      ps.expected_at
     FROM interview.planned_supply ps
     -- LEFT JOIN interview.planned_reservation pr ON (pr.planned_supply_id = ps.id)
     INNER JOIN interview.product prd ON (ps.product_id = prd.id)
     INNER JOIN interview.vendor ven ON (ps.vendor_id = ven.id)
     LEFT JOIN interview.batch bat ON (pr.batch_id = bat.id)
     LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
     LEFT JOIN auth.user us1 ON (pr.reserved_by = us1.id)
     LEFT JOIN (
          SELECT inventory_item_id, SUM(quantity) as reserved_quantity
          FROM interview.inventory_reservation
          WHERE status = 'RESERVED'
          GROUP BY inventory_item_id
     ) pr ON ON (pr.planned_supply_id = ps.id)
     WHERE ps.product_id = $1
       AND ps.vendor_id = $2
       AND ps.entity_id = $3
       AND ps.plant_id = $4
       AND ven.entity_id = $3
       AND ven.plant_id = $4
       AND (pr.entity_id = $3 OR pr.entity_id IS NULL)
       AND (pr.plant_id = $4 OR pr.plant_id IS NULL)
       AND (bat.entity_id = $3 OR bat.entity_id IS NULL)
       AND (bat.plant_id = $4 OR bat.plant_id IS NULL)
       AND (us1.entity_id = $3 OR us1.entity_id IS NULL)
     ORDER BY ps.expected_at ASC, pr.reserved_at DESC`

  const bind = [productId, vendorId, entityId, plantId]
  // const bind = [productId, vendorId]

  const response = await db.query(query, bind, client)
  return response
}

export async function updatePlannedReservationStatus (context, entityId, plantId, id, status, client = null) {
  const response = await db.value(
      `UPDATE interview.planned_reservation
       SET status = $1, reserved_at = $5
       WHERE id = $2 
       AND entity_id = $3
       AND plant_id = $4
       RETURNING *`,
      [status, id, entityId, plantId, timestamp()],
      client
  )
  return response
}

export const plannedReservationRepository = {
  ...baseRepository,
  createPlannedReservation,
  findPlannedReservationsForWorkOrder,
  findByProduct,
  updatePlannedReservationStatus
}
