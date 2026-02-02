import { ApiResponseOk } from '../../../../utils/response.js'

import { inventoryLocationRepository } from '../../../../repositories/inventoryLocation.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await inventoryLocationRepository.tablePaginated(search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
}

export async function findAll (args, context) {
  const response = await inventoryLocationRepository.findAll()

  return ApiResponseOk(response)
}

export async function findById (args, context) {
  const { locationId } = args

  const response = await inventoryLocationRepository.findById(locationId)

  return ApiResponseOk(response)
}

export async function findByNameOrCode (args, context) {
  const { search } = args

  const response = await inventoryLocationRepository.findByNameOrCode(search)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { locationId, locationName, locationCode, locationDescription } = args

  let response

  if (locationId) {
    response = await inventoryLocationRepository.update(context, locationId, locationName, locationCode, locationDescription)
  } else {
    response = await inventoryLocationRepository.create(context, uuid(), locationName, locationCode, locationDescription)
  }

  return ApiResponseOk(response)
}

export async function remove (args, context) {
  const { locationId } = args

  const response = await inventoryLocationRepository.deleteById(locationId)

  return ApiResponseOk(response)
}

export async function listAll (args, context) {
  const response = await inventoryLocationRepository.listAll()

  return ApiResponseOk(response)
}
