import { ApiResponseOk } from '../../../../utils/response.js'

import { inventoryReservationRepository } from '../../../../repositories/inventoryReservation.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await inventoryReservationRepository.tablePaginated(entityId, plantId, search, orderCol, orderDir, page, size)
  return ApiResponseOk(response)
}

export async function findById (args, context) {
  const { entityId, plantId } = context.session
  const { reservationId } = args

  const response = await inventoryReservationRepository.findById(context, entityId, plantId, reservationId)

  return ApiResponseOk(response)
}

export async function findByBatchId (args, context) {
  const { entityId, plantId } = context.session
  const { batchId } = args

  const response = await inventoryReservationRepository.findByBatchId(context, entityId, plantId, batchId)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { entityId, plantId } = context.session
  const { inventoryItemId, batchId, quantity, unitOfMeasureId, reservedBy, notes } = args

  const response = await inventoryReservationRepository.create(
    context,
    entityId,
    plantId,
    uuid(),
    inventoryItemId,
    batchId,
    quantity,
    unitOfMeasureId,
    reservedBy,
    notes
  )

  return ApiResponseOk(response)
}

export async function updateStatus (args, context) {
  const { entityId, plantId } = context.session
  const { reservationId, status } = args

  const response = await inventoryReservationRepository.updateStatus(context, entityId, plantId, reservationId, status)

  return ApiResponseOk(response)
}

export async function remove (args, context) {
  const { entityId, plantId } = context.session
  const { reservationId } = args

  const response = await inventoryReservationRepository.removeById(context, entityId, plantId, reservationId)

  return ApiResponseOk(response)
}

export async function listAll (args, context) {
  const { entityId, plantId } = context.session

  const response = await inventoryReservationRepository.listAll(context, entityId, plantId)

  return ApiResponseOk(response)
}
