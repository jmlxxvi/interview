import { db } from '../platform/db/index.js'
import { timestamp } from '../utils'

export async function insertPegging (data, client) {
  const {
    demandType,
    demandId,
    supplyType,
    supplyId,
    productId,
    quantity
  } = data

  await db.query(
    `INSERT INTO interview.pegging
     (id, demand_type, demand_id, supply_type, supply_id, product_id, quantity, pegged_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
    [
      demandType,
      demandId,
      supplyType,
      supplyId,
      productId,
      quantity,
      timestamp()
    ],
    client
  )
}
