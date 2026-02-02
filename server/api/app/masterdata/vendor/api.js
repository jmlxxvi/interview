import { ApiResponseOk } from '../../../../utils/response.js'

import { vendorRepository } from '../../../../repositories/vendor.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await vendorRepository.tablePaginated(context, entityId, plantId, search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
};

export async function findById (args, context) {
  const { entityId, plantId } = context.session

  const { vendorId } = args

  const response = await vendorRepository.findById(context, entityId, plantId, vendorId)

  return ApiResponseOk(response)
};

export async function findByNameOrCode (args, context) {
  const { entityId, plantId } = context.session

  const { search } = args

  const response = await vendorRepository.findByNameOrCode(context, entityId, plantId, search)

  return ApiResponseOk(response)
};

export async function findAll (args, context) {
  const { entityId, plantId } = context.session

  const response = await vendorRepository.findAll(context, entityId, plantId)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { entityId, plantId } = context.session

  const { vendorId, vendorName, vendorCode, vendorEmail } = args
  console.log('args: ', args)

  if (vendorId) {
    const response = await vendorRepository.update(context, entityId, plantId, vendorId, vendorName, vendorCode, vendorEmail)

    return ApiResponseOk(response)
  } else {
    const response = await vendorRepository.create(context, entityId, plantId, uuid(), vendorName, vendorCode, vendorEmail)
    return ApiResponseOk(response)
  }
};

export async function remove (args, context) {
  const { entityId, plantId } = context.session

  const { vendorId } = args
  console.log('args: ', args)

  const response = await vendorRepository.deleteById(context, entityId, plantId, vendorId)
  return ApiResponseOk(response)
};
