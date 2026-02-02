// availabilityService.js
// Centralized availability + pegging computation for MRP

import { db } from '../platform/db/index.js'

/**
 * Get total on-hand inventory for a product up to a specific date.
 * Includes all inventory_item entries created on or before asOfEpoch.
 */
export async function getOnHand (productId, asOfEpoch = Number.MAX_SAFE_INTEGER) {
  const response = await db.row(
    `
    SELECT COALESCE(SUM(quantity), 0)::numeric AS onhand
    FROM interview.inventory_item
    WHERE product_id = $1
      AND created_at <= $2
    `,
    [productId, asOfEpoch]
  )

  return Number(response.onhand ?? 0)
}

/**
 * Get allocated inventory (MRP reservations) up to a specific date.
 * Includes reservations still open at the reference date.
 */
export async function getAllocatedBeforeDate (productId, asOfEpoch) {
  const response = await db.row(
    `
    SELECT COALESCE(SUM(reserved_quantity), 0)::numeric AS allocated
    FROM interview.planned_reservation
    WHERE product_id = $1
      AND needed_by <= $2
      AND status IN ('OPEN', 'PARTIAL')
    `,
    [productId, asOfEpoch]
  )

  return Number(response.allocated ?? 0)
}

/**
 * Get scheduled receipts (incoming supply) on or before asOfEpoch.
 * Includes:
 *  - Purchase orders not yet received
 *  - Work orders that will produce finished goods
 */
export async function getScheduledReceipts (productId, asOfEpoch) {
  const response = await db.row(
    `
    SELECT COALESCE(SUM(quantity), 0)::numeric AS supply
    FROM interview.planned_supply
    WHERE product_id = $1
      AND expected_date <= $2
      AND status IN ('PLANNED', 'CONFIRMED')
    `,
    [productId, asOfEpoch]
  )

  return Number(response.supply ?? 0)
}

/**
 * Main MRP availability function.
 * Computes available inventory at a specific date
 * taking into account on-hand, allocations, and scheduled supply.
 *
 * Returns: {
 *   available, onHand, allocated, incomingSupply
 * }
 */
export async function getAvailableOnDate (productId, asOfEpoch) {
  const onHand = await getOnHand(productId, asOfEpoch)
  const allocated = await getAllocatedBeforeDate(productId, asOfEpoch)
  const incomingSupply = await getScheduledReceipts(productId, asOfEpoch)

  const available = onHand + incomingSupply - allocated

  return {
    available,
    onHand,
    allocated,
    incomingSupply
  }
}

/**
 * Retrieve pegging details:
 *   Which supplies are covering which demands?
 * Returns: [
 *   { demand_id, supply_id, quantity }
 * ]
 */
export async function getPegging (productId) {
  const { rows } = await db.row(
    `
    SELECT
      r.demand_id,
      s.id AS supply_id,
      r.pegged_qty AS quantity
    FROM interview.pegging r
    JOIN interview.planned_supply s ON r.supply_id = s.id
    WHERE r.product_id = $1
    ORDER BY r.demand_id, s.expected_date
    `,
    [productId]
  )

  return rows
}
