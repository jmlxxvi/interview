import { ApiResponseOk } from '../../../../utils/response.js'
import { plannedSupplyRepository } from '../../../../repositories/plannedSupply.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session
  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await plannedSupplyRepository.tablePaginated(entityId, plantId, search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
}

export async function findById (args, context) {
  const { entityId, plantId } = context.session
  const { plannedSupplyId } = args

  const response = await plannedSupplyRepository.findById(context, entityId, plantId, plannedSupplyId)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { entityId, plantId } = context.session
  const { id, productId, vendorId, quantity, sourceType, sourceCode, expectedAt } = args

  let response

  if (id) {
    response = await plannedSupplyRepository.update(
      context,
      entityId,
      plantId,
      id,
      productId,
      vendorId,
      quantity,
      sourceType,
      sourceCode,
      expectedAt
    )
  } else {
    const newId = uuid()
    response = await plannedSupplyRepository.create(
      context,
      entityId,
      plantId,
      newId,
      productId,
      vendorId,
      quantity,
      sourceType,
      sourceCode,
      expectedAt
    )
  }

  return ApiResponseOk(response)
}

export async function remove (args, context) {
  const { entityId, plantId } = context.session
  const { plannedSupplyId } = args

  const response = await plannedSupplyRepository.deleteById(context, entityId, plantId, plannedSupplyId)

  return ApiResponseOk(response)
}
