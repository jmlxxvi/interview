import { ApiResponseResult } from '../../../../utils/response.js'
import { batchRepository } from '../../../../repositories/batch.js'
import { generateEntityCode } from '../../../../services/utils.js'

export async function list (args, context) {
  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const Result = await batchRepository.tablePaginated(search, orderCol, orderDir, page, size)

  return ApiResponseResult(Result, 2000)
}

export async function find (args, context) {
  const { batchId } = args

  const Result = await batchRepository.findById(batchId)

  return ApiResponseResult(Result, 2000)
}

export async function findByWorkOrderId (args, context) {
  const { workOrderId } = args

  const Result = await batchRepository.findByWorkOrderId(context, workOrderId)

  return ApiResponseResult(Result, 2000)
}

export async function create (args, context) {
  const { code, productId, workOrderId, assignedEmployeeId, status, quantity, plannedStart, plannedEnd } = args

  const Result = await batchRepository.create(
    context,
    code,
    productId,
    workOrderId,
    assignedEmployeeId,
    status,
    quantity,
    plannedStart,
    plannedEnd
  )

  return ApiResponseResult(Result, 2000)
}

export async function update (args, context) {
  const { batchId, workOrderId, assignedEmployeeId, status, quantity, plannedStart, plannedEnd, actualStart, actualEnd } = args

  let code = args.code

  // If code is empty, set it to a new value from the sequence
  if (!code) {
    code = await generateEntityCode('BAT')
  }

  const Result = await batchRepository.update(
    context,
    batchId,
    code,
    workOrderId,
    assignedEmployeeId,
    status,
    quantity,
    plannedStart,
    plannedEnd,
    actualStart,
    actualEnd
  )

  return ApiResponseResult(Result, 2000)
}

export async function remove (args, context) {
  const { batchId } = args

  const Result = await batchRepository.deleteById(batchId)

  return ApiResponseResult(Result, 2000)
}
