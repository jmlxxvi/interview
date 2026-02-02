import { ApiResponseOk } from '../../../../utils/response.js'

import { inventoryMovementRepository } from '../../../../repositories/inventoryMovement.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await inventoryMovementRepository.tablePaginated(context, entityId, plantId, search, orderCol, orderDir, page, size)
  return ApiResponseOk(response)
}

export async function findById (args, context) {
  const { movementId } = args

  const response = await inventoryMovementRepository.findById(movementId)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { inventoryItemId, movementType, quantity, workOrderId, sourceLocationId, destinationLocationId, reason } = args

  const response = await inventoryMovementRepository.create(
    context,
    uuid(),
    inventoryItemId,
    movementType,
    quantity,
    workOrderId,
    sourceLocationId,
    destinationLocationId,
    reason
  )

  return ApiResponseOk(response)
}

export async function remove (args, context) {
  const { movementId } = args

  const response = await inventoryMovementRepository.deleteById(movementId)

  return ApiResponseOk(response)
}

export async function listAll (args, context) {
  const response = await inventoryMovementRepository.listAll()

  return ApiResponseOk(response)
}
