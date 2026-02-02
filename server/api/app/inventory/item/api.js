import { ApiResponseOk } from '../../../../utils/response.js'

import { inventoryItemRepository } from '../../../../repositories/inventoryItem.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, isOwn } = args

  const response = await inventoryItemRepository.tablePaginated(context, entityId, plantId, search, orderCol, orderDir, page, size, isOwn)

  return ApiResponseOk(response)
}

export async function findById (args, context) {
  const { entityId, plantId } = context.session

  const { itemId } = args

  const response = await inventoryItemRepository.findById(context, entityId, plantId, itemId)

  return ApiResponseOk(response)
}

export async function findByNameOrCode (args, context) {
  const { entityId, plantId } = context.session

  const { search } = args

  const response = await inventoryItemRepository.findByNameOrCode(context, entityId, plantId, search)

  return ApiResponseOk(response)
}

export async function findByProduct (args, context) {
  const { entityId, plantId } = context.session

  const { productId, vendorId } = args

  const response = await inventoryItemRepository.findByProduct(context, entityId, plantId, productId, vendorId)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { entityId, plantId } = context.session

  const { itemId, productId, lotId, vendorId, price, currency, quantity, expirationAt, locationId, type } = args

  let response

  if (itemId) {
    response = await inventoryItemRepository.update(context, entityId, plantId, itemId, productId, lotId, vendorId, price, currency, quantity, expirationAt, locationId, type)
  } else {
    response = await inventoryItemRepository.create(context, entityId, plantId, uuid(), productId, lotId, vendorId, price, currency, quantity, expirationAt, locationId, type)
  }

  return ApiResponseOk(response)
}

export async function remove (args, context) {
  const { entityId, plantId } = context.session

  const { itemId } = args

  const response = await inventoryItemRepository.deleteById(context, entityId, plantId, itemId)

  return ApiResponseOk(response)
}

export async function listAll (args, context) {
  const { entityId, plantId } = context.session

  const response = await inventoryItemRepository.listAll(context, entityId, plantId)

  return ApiResponseOk(response)
}
