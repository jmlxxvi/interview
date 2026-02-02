import { ApiResponseOk } from '../../../../utils/response.js'
import { equipmentRepository } from '../../../../repositories/equipment.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await equipmentRepository.tablePaginated(context, entityId, plantId, search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
};

export async function find (args, context) {
  const { entityId, plantId } = context.session

  const { equipmentId } = args

  const response = await equipmentRepository.findById(context, entityId, plantId, equipmentId)

  return ApiResponseOk(response)
};

export async function save (args, context) {
  const { entityId, plantId } = context.session

  const { equipmentId, code, name, workCenterId, status } = args

  if (equipmentId) {
    const response = await equipmentRepository.update(
      context,
      entityId,
      plantId,
      equipmentId,
      code,
      name,
      workCenterId,
      status || 'AVAILABLE'
    )

    return ApiResponseOk(response)
  } else {
    const response = await equipmentRepository.create(
      context,
      entityId,
      plantId,
      uuid(),
      code,
      name,
      workCenterId,
      status || 'AVAILABLE'
    )

    return ApiResponseOk(response)
  }
};

export async function remove (args, context) {
  const { entityId, plantId } = context.session

  const { equipmentId } = args

  const response = await equipmentRepository.deleteById(context, entityId, plantId, equipmentId)

  return ApiResponseOk(response)
};

export async function listAll (_args, context) {
  const { entityId, plantId } = context.session

  const response = await equipmentRepository.listAll(context, entityId, plantId)

  return ApiResponseOk(response)
};
