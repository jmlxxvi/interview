import { ApiResponseOk } from '../../../../utils/response.js'
import { inventoryService } from '../../../../services/inventory.js'

export async function receive (args, context) {
  console.log('args: ', args)

  const { entityId, plantId } = context.session

  const {
    productId,
    lotId,
    lotCode,
    vendorId,
    expirationDate,
    quantity,
    locationId,
    type,
    price,
    currency
  } = args

  const response = await inventoryService.receiveToInventory(
    context,
    entityId,
    plantId,
    productId,
    lotId,
    lotCode,
    vendorId,
    expirationDate,
    quantity,
    locationId,
    type,
    price,
    currency,
    undefined,
    undefined
  )

  return ApiResponseOk(response)
}
