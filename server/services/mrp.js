// src/services/mrpService.js
import { db } from '../platform/db/index.js'

import { plannedSupplyRepository } from '../repositories/plannedSupply.js'
import { mrpReservationRepository } from '../repositories/mrpReservation.js'
import { billOfMaterialsRepository } from '../repositories/billOfMaterials.js'

/**
 * Explode BOM (1-level). If you need recursive explosion, extend this function.
 * Returns array of { material_id, quantity_per_unit, uom_id }
 */
export async function explodeBom (context, entityId, plantId, productId, client = null) {
  // Example: reuse your BOM repo (implement properly)
  const bomItems = await billOfMaterialsRepository.getBomItems(context, entityId, plantId, productId, client)
  // Map to normalized structure
  return bomItems.map(r => ({
    material_id: r.component_id,
    quantity_per_unit: parseFloat(r.quantity),
    unit_id: r.unit_of_measure_id
  }))
}

/**
 * Get on-hand total for a product (sum of inventory_item.quantity)
 */
export async function getPhysicalOnHand (context, entityId, plantId, productId, client = null) {
  const response = await db.value(
    `SELECT COALESCE(SUM(quantity),0)::numeric AS onhand
     FROM interview.inventory_item
     WHERE product_id = $1
     AND entity_id = $2
     AND plant_id = $3`,
    [productId, entityId, plantId],
    client
  )
  return parseFloat(response?.onhand || 0)
}

/**
 * Run a simple MRP for a list of planned work orders.
 * workOrders: [{ id, product_id, required_date (epoch), quantity, unit_id, created_by }]
 *
 * Strategy:
 *  - For each work order, explode BOM to get material requirements
 *  - For each material req: compute available (= onhand + confirmed planned supply before required_date - already allocated planned supply)
 *  - If shortage: allocate from planned_supply (ordered by expected_date asc) by creating mrp_reservation rows
 */
export async function runMrpForWorkOrders (context, entityId, plantId, workOrders) {
  const client = await db.acquireClient()
  try {
    await client.query('BEGIN')

    const createdBy = context.session.userId
    const results = []

    for (const wo of workOrders) {
      // explode bom
      const bomItems = await explodeBom(context, entityId, plantId, wo.product_id, client)
      const woResult = { workOrderId: wo.id, allocations: [] }

      for (const bi of bomItems) {
        // required total = quantity_per_unit * wo.quantity
        const requiredQty = bi.quantity_per_unit * parseFloat(wo.quantity)

        // Step: compute on-hand
        const onHand = await getPhysicalOnHand(bi.material_id)

        // Step: compute confirmed planned supply (supply expected <= required_date)
        const plannedSupplies = await plannedSupplyRepository.getPlannedSupplyByProduct(context, entityId, plantId, bi.material_id, wo.required_date, client)

        // Compute already allocated planned supply to other MRP reservations (PLANNED or CONFIRMED)
        const { rows: allocatedRows } = await client.query(
          `SELECT COALESCE(SUM(reserved_quantity),0)::numeric AS allocated
           FROM interview.mrp_reservation mr
           JOIN interview.planned_supply ps ON ps.id = mr.planned_supply_id
           WHERE ps.product_id = $1 AND mr.status IN ('PLANNED','CONFIRMED')`,
          [bi.material_id]
        )
        const alreadyAllocated = parseFloat(allocatedRows[0].allocated || 0)

        // available from onhand and already-confirmed supply
        // (note: onHand is real stock; planned supply we will use next)
        let remaining = requiredQty - onHand
        if (remaining <= 0) {
          // no need to allocate planned supply
          continue
        }

        // subtract any planned supply that is already allocated to others but also expected earlier
        // we will attempt to allocate from plannedSupplies list in order of expected_date
        for (const ps of plannedSupplies) {
          if (remaining <= 0) break
          // compute how much of this planned supply is still available (ps.quantity minus sum of mrp_reservations on it)
          const { rows: usedRows } = await client.query(
            `SELECT COALESCE(SUM(reserved_quantity),0)::numeric AS used
             FROM interview.mrp_reservation
             WHERE planned_supply_id = $1 AND status IN ('PLANNED','CONFIRMED')`,
            [ps.id]
          )
          const used = parseFloat(usedRows[0].used || 0)
          const availableOnPs = parseFloat(ps.quantity) - used
          if (availableOnPs <= 0) continue
          const toReserve = Math.min(availableOnPs, remaining)

          // create mrp_reservation and reduce planned_supply.quantity
          const reservation = await mrpReservationRepository.createMrpReservation({
            context,
            entityId,
            plantId,
            workOrderId: wo.id,
            plannedSupplyId: ps.id,
            reservedQuantity: toReserve,
            unitId: bi.unit_id
          }, client)

          // optionally, immediately decrement planned_supply.quantity (we keep it to reflect remaining)
          await plannedSupplyRepository.reducePlannedSupply(ps.id, toReserve, client)

          woResult.allocations.push({
            materialId: bi.material_id,
            plannedSupplyId: ps.id,
            reservedQuantity: toReserve,
            reservationId: reservation.id,
            expectedDate: ps.expected_date
          })

          remaining -= toReserve
        }

        if (remaining > 0) {
          // shortage — report it
          woResult.allocations.push({
            materialId: bi.material_id,
            shortage: remaining
          })
        }
      } // end for each BOM item

      results.push(woResult)
    } // end for each work order

    await db.commit(client)
    return results
  } catch (err) {
    console.log('runMrpForWorkOrders err: ', err)
    await db.rollback(client)
    throw err
  } finally {
    await db.releaseClient(client)
  }
}
