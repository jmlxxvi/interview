import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.inventory_movement')

const findById = async (movementId, client = null) => {
  const query = `
           SELECT 
            mov.id,
            mov.inventory_item_id,
            itm.product_id,
            prd.code as product_code,
            prd."name" as product_name,
            mov.movement_type,
            mov.quantity,
            mov.work_order_id,
            wo.code as work_order_code,
            mov.source_location_id,
            sloc.code as source_location_code,
            sloc."name" as source_location_name,
            mov.destination_location_id,
            dloc.code as destination_location_code,
            dloc."name" as destination_location_name,
            mov.reason,
            mov.created_at,
            us1.full_name as "created_by"
           FROM interview.inventory_movement mov
           LEFT JOIN interview.inventory_item itm ON (mov.inventory_item_id = itm.id)
           LEFT JOIN interview.product prd ON (itm.product_id = prd.id)
           LEFT JOIN interview.work_order wo ON (mov.work_order_id = wo.id)
           LEFT JOIN interview.inventory_location sloc ON (mov.source_location_id = sloc.id)
           LEFT JOIN interview.inventory_location dloc ON (mov.destination_location_id = dloc.id)
           INNER JOIN auth.user us1 ON (mov.created_by = us1.id)
           WHERE mov.id = $1`

  const bind = [movementId]

  const response = await db.row(query, bind, client)

  return response
}

const tablePaginated = async (context, entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            mov.id,
            mov.inventory_item_id,
            itm.product_id,
            prd.code as product_code,
            prd."name" as product_name,
            puom.code as unit_of_measure_code,
            itm.lot_id,
            lot.code as lot_code,
            itm.vendor_id,
            ven.code as vendor_code,
            ven."name" as vendor_name,
            mov.movement_type,
            mov.quantity,
            mov.work_order_id,
            wo.code as work_order_code,
            mov.source_location_id,
            sloc.code as source_location_code,
            sloc."name" as source_location_name,
            mov.destination_location_id,
            dloc.code as destination_location_code,
            dloc."name" as destination_location_name,
            mov.reason,
            mov.created_at,
            us1.full_name as "created_by"
           FROM interview.inventory_movement mov
           LEFT JOIN interview.inventory_item itm ON (mov.inventory_item_id = itm.id)
           LEFT JOIN interview.product prd ON (itm.product_id = prd.id)
           LEFT JOIN interview.lot lot ON (itm.lot_id = lot.id)
           LEFT JOIN interview.vendor ven ON (itm.vendor_id = ven.id)
           LEFT JOIN interview.work_order wo ON (mov.work_order_id = wo.id)
           LEFT JOIN interview.inventory_location sloc ON (mov.source_location_id = sloc.id)
           LEFT JOIN interview.inventory_location dloc ON (mov.destination_location_id = dloc.id)
           INNER JOIN interview.unit_of_measure puom ON (prd.unit_of_measure_id = puom.id)
           INNER JOIN auth.user us1 ON (mov.created_by = us1.id)
           WHERE 1=1
            AND (
                prd."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                prd.code ILIKE concat('%', concat($1::varchar, '%')) OR
                wo.code ILIKE concat('%', concat($1::varchar, '%')) OR
                sloc."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                dloc."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                mov.reason ILIKE concat('%', concat($1::varchar, '%'))
            )
            AND mov.entity_id = $2
            AND mov.plant_id = $3
            ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, movementId, inventoryItemId, movementType, quantity, workOrderId, sourceLocationId, destinationLocationId, reason, client = null) => {
  const query = `
            INSERT INTO interview.inventory_movement
            (id, inventory_item_id, movement_type, quantity, work_order_id, source_location_id, destination_location_id, reason, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `
  const bind = [
    movementId,
    inventoryItemId || null,
    movementType,
    quantity,
    workOrderId || null,
    sourceLocationId || null,
    destinationLocationId || null,
    reason || null,
    context.session.userId,
    timestamp()
  ]

  const response = await db.query(query, bind, client)

  return response
}

const deleteById = async (movementId, client = null) => {
  const query = `
            DELETE FROM interview.inventory_movement
            WHERE id = $1
            RETURNING id
        `
  const bind = [movementId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (client = null) => {
  const query = `
    SELECT 
      mov.id,
      mov.movement_type,
      mov.quantity,
      prd.code as product_code,
      prd."name" as product_name,
      mov.created_at
    FROM interview.inventory_movement mov
    LEFT JOIN interview.inventory_item itm ON (mov.inventory_item_id = itm.id)
    LEFT JOIN interview.product prd ON (itm.product_id = prd.id)
    ORDER BY mov.created_at DESC
  `

  const response = await db.query(query, [], client)

  return response
}

export const inventoryMovementRepository = {
  ...baseRepository,
  findById,
  tablePaginated,
  create,
  deleteById,
  listAll
}
