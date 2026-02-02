import { ApiResponseOk } from '../../../../utils/response.js'
import { workCenterRepository } from '../../../../repositories/workCenter.js'
import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await workCenterRepository.tablePaginated(context, entityId, plantId, search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
};

export async function find (args, context) {
  const { entityId, plantId } = context.session

  const { workCenterId } = args

  const response = await workCenterRepository.findById(context, entityId, plantId, workCenterId)

  return ApiResponseOk(response)
};

export async function findAll (args, context) {
  const { entityId, plantId } = context.session

  const response = await workCenterRepository.findAll(context, entityId, plantId)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { entityId, plantId } = context.session

  const { workCenterId, code, name, description, location } = args

  if (!workCenterId) {
    const response = await workCenterRepository.create(
      context,
      entityId,
      plantId,
      uuid(),
      code,
      name,
      description,
      location
    )

    return ApiResponseOk(response)
  } else {
    const response = await workCenterRepository.update(
      context,
      entityId,
      plantId,
      workCenterId,
      code,
      name,
      description,
      location
    )

    return ApiResponseOk(response)
  }
};

export async function remove (args, context) {
  const { entityId, plantId } = context.session

  const { workCenterId } = args

  const response = await workCenterRepository.deleteById(context, entityId, plantId, workCenterId)

  return ApiResponseOk(response)
};

// export async function listAll (_args, context) {
//   const { entityId, plantId } = context.session

//   const response = await workCenterRepository.listAll(context, entityId, plantId)

//   return ApiResponseOk(response)
// };
