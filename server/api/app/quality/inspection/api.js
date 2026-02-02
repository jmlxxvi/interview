import { ApiResponseOk } from '../../../../utils/response.js'

import { qualityInspectionRepository } from '../../../../repositories/qualityInspection.js'

export async function list (args, context) {
  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await qualityInspectionRepository.tablePaginated(context, search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
}

export async function findById (args, context) {
  const { qualityInspectionId } = args

  const response = await qualityInspectionRepository.findById(context, qualityInspectionId)

  return ApiResponseOk(response)
}

export async function findByBatchOrOperation (args, context) {
  const { search } = args

  const response = await qualityInspectionRepository.findByBatchOrOperation(context, search)

  return ApiResponseOk(response)
}

export async function findAll (args, context) {
  const response = await qualityInspectionRepository.findAll(context)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { qualityInspectionId, batchId, operationId, inspectedBy, result, notes } = args

  if (qualityInspectionId) {
    const response = await qualityInspectionRepository.update(context, qualityInspectionId, batchId, operationId, inspectedBy, result, notes)

    return ApiResponseOk(response)
  } else {
    const response = await qualityInspectionRepository.create(context, batchId, operationId, inspectedBy, result, notes)

    return ApiResponseOk(response)
  }
}

export async function remove (args, context) {
  const { qualityInspectionId } = args

  const response = await qualityInspectionRepository.remove(context, qualityInspectionId)

  return ApiResponseOk(response)
}
