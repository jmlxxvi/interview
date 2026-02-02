import { ApiResponseOk } from '../../../../utils/response.js'
import { inventoryService } from '../../../../services/inventory.js'

export async function adjust (args, context) {
  const { entityId, plantId } = context.session

  const {
    inventoryItemId,
    deltaQuantity,
    reason
  } = args

  const response = await inventoryService.adjustInventory(
    context,
    entityId,
    plantId,
    inventoryItemId,
    parseFloat(deltaQuantity),
    reason
  )

  return ApiResponseOk(response)
}

export async function getInventoryItems (args, context) {
  const { locationId } = args

  const query = `
    SELECT 
      ii.id as inventory_item_id,
      ii.quantity,
      ii.location_id,
      p.id as product_id,
      p.code as product_code,
      p.name as product_name,
      l.code as lot_code,
      loc.code as location_code,
      loc.name as location_name,
      ii.type,
      COALESCE(
        (SELECT SUM(quantity)
         FROM interview.inventory_reservation ir
         WHERE ir.inventory_item_id = ii.id
           AND ir.status = 'RESERVED'
        ), 0
      )::numeric as reserved_quantity,
      (ii.quantity - COALESCE(
        (SELECT SUM(quantity)
         FROM interview.inventory_reservation ir
         WHERE ir.inventory_item_id = ii.id
           AND ir.status = 'RESERVED'
        ), 0
      ))::numeric as available_quantity
    FROM interview.inventory_item ii
    INNER JOIN interview.product p ON ii.product_id = p.id
    LEFT JOIN interview.lot l ON ii.lot_id = l.id
    INNER JOIN interview.inventory_location loc ON ii.location_id = loc.id
    WHERE ($1::uuid IS NULL OR ii.location_id = $1)
    ORDER BY loc.name, p.name, l.code
  `

  const db = await import('../../../../platform/db/index.js')
  const response = await db.default.sql(query, [locationId || null])

  return ApiResponseOk(response)
}
