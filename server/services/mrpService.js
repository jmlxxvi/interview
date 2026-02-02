// src/services/mrpService.js
import { db } from '../platform/db/index.js'

import {
  getAvailableOnDate,
  getAllocatedBeforeDate,
  getScheduledReceipts
} from './availability.js'

import {
  createInventoryReservation
} from './inventoryReservationService.js'

import {
  createPlannedSupply
} from '../repositories/plannedSupply.js'

import {
  insertPegging
} from './pegging.js'

/**
 * Canonical MRP run
 */
export async function runMrpForWorkOrders (workOrders) {
  const client = await db.acquireClient()

  try {
    await db.begin(client)

    // Sort demands by priority date
    workOrders.sort((a, b) => a.requiredAt - b.requiredAt)

    for (const wo of workOrders) {
      for (const bomItem of wo.materials) {
        const {
          productId,
          requiredQty,
          unitId
        } = bomItem

        const demandDate = wo.requiredAt

        // --- Time-phased availability ---
        const onHand = await getAvailableOnDate(productId, demandDate, client)
        const allocated = await getAllocatedBeforeDate(productId, demandDate, client)
        const scheduledSupply = await getScheduledReceipts(productId, demandDate, client)

        const netAvailable = onHand + scheduledSupply - allocated
        let remainingDemand = requiredQty

        // --- Use available supply ---
        if (netAvailable > 0) {
          const allocatedQty = Math.min(netAvailable, remainingDemand)

          // Firm reservation
          const reservation = await createInventoryReservation(
            {
              productId,
              batchId: wo.batch_id,
              quantity: allocatedQty,
              unitId
            },
            client
          )

          // Peg to ON_HAND or SCHEDULED
          await insertPegging(
            {
              demandType: 'WORK_ORDER',
              demandId: wo.id,
              supplyType: 'ON_HAND',
              supplyId: reservation.inventory_item_id,
              productId,
              quantity: allocatedQty
            },
            client
          )

          remainingDemand -= allocatedQty
        }

        // --- Shortage → Planned supply ---
        if (remainingDemand > 0) {
          const planned = await createPlannedSupply(
            {
              productId,
              quantity: remainingDemand,
              needBy: demandDate
            },
            client
          )

          // Peg planned supply
          await insertPegging(
            {
              demandType: 'WORK_ORDER',
              demandId: wo.id,
              supplyType: 'PLANNED',
              supplyId: planned.id,
              productId,
              quantity: remainingDemand
            },
            client
          )
        }
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
