import { ApiResponseOk } from '../../../../utils/response.js'
import { operationRepository } from '../../../../repositories/operation.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await operationRepository.tablePaginated(context, entityId, plantId, search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
};

export async function find (args, context) {
  const { entityId, plantId } = context.session

  const { operationId } = args

  const response = await operationRepository.findById(context, entityId, plantId, operationId)

  return ApiResponseOk(response)
};

export async function save (args, context) {
  const { entityId, plantId } = context.session

  const { operationId, code, name, standardDuration, description } = args

  if (operationId) {
    const response = await operationRepository.update(
      context,
      entityId,
      plantId,
      operationId,
      code,
      name,
      standardDuration,
      description
    )

    return ApiResponseOk(response)
  } else {
    const response = await operationRepository.create(
      context,
      entityId,
      plantId,
      uuid(),
      code,
      name,
      standardDuration,
      description
    )

    return ApiResponseOk(response)
  }
};

export async function remove (args, context) {
  const { entityId, plantId } = context.session

  const { operationId } = args

  const response = await operationRepository.deleteById(context, entityId, plantId, operationId)

  return ApiResponseOk(response)
};

export async function listAll (args, context) {
  const { entityId, plantId } = context.session

  const response = await operationRepository.listAll(context, entityId, plantId)

  return ApiResponseOk(response)
};
