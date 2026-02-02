import { ApiResponseOk } from '../../../../utils/response.js'
import { inventoryService } from '../../../../services/inventory.js'

export async function transfer (args, context) {
  const {
    inventoryItemId,
    quantity,
    destinationLocationId
  } = args

  const response = await inventoryService.transferInventory({
    inventoryItemId,
    quantity,
    destinationLocationId,
    createdBy: context.session.userId
  })

  return ApiResponseOk(response)
}

export async function getAvailableItems (args, context) {
  const { locationId } = args

  const query = `
    SELECT 
      ii.id,
      ii.product_id,
      prd.code as product_code,
      prd.name as product_name,
      ii.lot_id,
      lot.code as lot_code,
      ii.quantity,
      ii.type,
      COALESCE(
        (SELECT SUM(quantity)
         FROM interview.inventory_reservation ir
         WHERE ir.inventory_item_id = ii.id
           AND ir.status='RESERVED'
        ),0
      )::numeric AS reserved_quantity,
      (ii.quantity - COALESCE(
        (SELECT SUM(quantity)
         FROM interview.inventory_reservation ir
         WHERE ir.inventory_item_id = ii.id
           AND ir.status='RESERVED'
        ),0
      ))::numeric AS available_quantity
    FROM interview.inventory_item ii
    INNER JOIN interview.product prd ON (ii.product_id = prd.id)
    LEFT JOIN interview.lot lot ON (ii.lot_id = lot.id)
    WHERE ii.location_id = $1
      AND (ii.quantity - COALESCE(
        (SELECT SUM(quantity)
         FROM interview.inventory_reservation ir
         WHERE ir.inventory_item_id = ii.id
           AND ir.status='RESERVED'
        ),0
      )) > 0
    ORDER BY prd.name, lot.code
  `

  const db = await import('../../../../platform/db/index.js')
  const response = await db.default.sql(query, [locationId])

  return ApiResponseOk(response)
}
