import { db } from '../platform/db/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.bill_of_materials')

export async function getBomItems (context, entityId, plantId, productId, client = null) {
  // Returns latest BOM items for product -- adapt to your versioning if needed
  const response = await db.query(
    `SELECT b.item.*, b.version
     FROM interview.bill_of_materials bom
     JOIN interview.bill_of_materials_item b.item ON b.item.bill_of_materials_id = bom.id
     WHERE bom.product_id = $1
         AND bom.entity_id = $2
         AND bom.plant_id = $3
     ORDER BY bom.created_at DESC
     LIMIT 1`
    , [productId, entityId, plantId]
    , client
  )
  return response
}

export const billOfMaterialsRepository = {
  ...baseRepository,
  getBomItems
}
