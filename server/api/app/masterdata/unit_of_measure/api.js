import { ApiResponseOk } from '../../../../utils/response.js'
import { unitOfMeasureRepository } from '../../../../repositories/unitOfMeasure.js'

export async function list (args, context) {
  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await unitOfMeasureRepository.tablePaginated(search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
};

export async function find (args, context) {
  const { unitId } = args

  const response = await unitOfMeasureRepository.findById(unitId)

  return ApiResponseOk(response)
};

export async function save (args, context) {
  const { unitId, code, name, category, conversionFactor, baseUnitId, isBase, description } = args

  const response = await unitOfMeasureRepository.update(
    context,
    unitId,
    code,
    name,
    category,
    conversionFactor || 1,
    baseUnitId,
    isBase || false,
    description
  )

  return ApiResponseOk(response)
};

export async function remove (args, context) {
  const { unitId } = args

  const response = await unitOfMeasureRepository.deleteById(unitId)

  return ApiResponseOk(response)
};

export async function listAll (args, context) {
  const response = await unitOfMeasureRepository.listAll()

  return ApiResponseOk(response)
};
