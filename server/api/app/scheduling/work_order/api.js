import { ApiResponseOk, ApiResponseResult } from '../../../../utils/response.js'
import { workOrderRepository } from '../../../../repositories/workOrder.js'
import { workOrderService } from '../../../../services/workOrder.js'
import { batchRepository } from '../../../../repositories/batch.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session
  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const response = await workOrderRepository.tablePaginated(context, entityId, plantId, search, orderCol, orderDir, page, size)

  return ApiResponseOk(response)
}

export async function getWorkOrderDetails (args, context) {
  const { entityId, plantId } = context.session

  const { workOrderId } = args

  // TODO if using getWorkOrderDetails the name of the API function should be changed
  const response = await workOrderRepository.getWorkOrderDetails(context, entityId, plantId, workOrderId)

  return ApiResponseOk(response)
}

export async function save (args, context) {
  const { entityId, plantId } = context.session

  const { status, data } = args

  const Result = await workOrderService.save(
    context,
    entityId,
    plantId,
    data,
    status
  )

  return ApiResponseResult(Result, 2000)
}

export async function selectLotsForBatch (args, context) {
  const { entityId, plantId } = context.session

  const { materials } = args

  const Result = await workOrderService.selectLotsForBatch(
    context,
    entityId,
    plantId,
    materials
  )

  return ApiResponseResult(Result, 2000)
}

export async function selectLotsForBatchMaterial (args, context) {
  const { entityId, plantId } = context.session

  const { productId, vendorId } = args

  const Result = await workOrderService.selectLotsForBatchMaterial(
    context,
    entityId,
    plantId,
    productId,
    vendorId
  )

  return ApiResponseResult(Result, 2000)
}

export async function selectPlannedForBatchMaterial (args, context) {
  const { entityId, plantId } = context.session

  const { productId, vendorId } = args

  const Result = await workOrderService.selectPlannedForBatchMaterial(
    context,
    entityId,
    plantId,
    productId,
    vendorId
  )

  return ApiResponseResult(Result, 2000)
}

export async function clone (args, context) {
  const { entityId, plantId } = context.session

  const { workOrderId } = args

  const Result = await workOrderService.clone(
    context,
    entityId,
    plantId,
    workOrderId
  )

  return ApiResponseResult(Result, 2001)
}

export async function remove (args, context) {
  const { entityId, plantId } = context.session

  const { workOrderId } = args

  const response = await workOrderRepository.deleteById(context, entityId, plantId, workOrderId)

  return ApiResponseOk(response)
}

export async function deleteBatch (args, context) {
  const { entityId, plantId } = context.session

  const { batchId } = args

  const response = await batchRepository.deleteById(context, entityId, plantId, batchId)

  return ApiResponseOk(response)
}

export async function listAll (args, context) {
  const response = await workOrderRepository.listAll()

  return ApiResponseOk(response)
}
