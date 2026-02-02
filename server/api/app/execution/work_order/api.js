import { ApiResponseOk, ApiResponseResult } from '../../../../utils/response.js'
import { workOrderRepository } from '../../../../repositories/workOrder.js'
import { workOrderService } from '../../../../services/workOrder.js'

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

export async function startBatchOperation (args, context) {
  const { entityId, plantId } = context.session

  const { workOrderId, batchId, operationId } = args

  const response = await workOrderService.startBatchOperation(context, entityId, plantId, workOrderId, batchId, operationId)

  return ApiResponseResult(response, 2000)
}

export async function completeBatchOperation (args, context) {
  const { entityId, plantId } = context.session

  const { workOrderId, batchId, operationId } = args

  const response = await workOrderService.completeBatchOperation(context, entityId, plantId, workOrderId, batchId, operationId)

  return ApiResponseResult(response, 2000)
}

export async function cancelBatchOperation (args, context) {
  const { entityId, plantId } = context.session

  const { workOrderId, batchId, operationId } = args

  const response = await workOrderService.cancelBatchOperation(context, entityId, plantId, workOrderId, batchId, operationId)

  return ApiResponseResult(response, 2000)
}

export async function passBatchQualityControl (args, context) {
  const { entityId, plantId } = context.session

  const { qualityControlId } = args
  const response = await workOrderService.passBatchQualityControl(context, entityId, plantId, qualityControlId)
  return ApiResponseResult(response, 2000)
}

export async function failBatchQualityControl (args, context) {
  const { entityId, plantId } = context.session

  const { qualityControlId } = args
  const response = await workOrderService.failBatchQualityControl(context, entityId, plantId, qualityControlId)

  return ApiResponseResult(response, 2000)
}

export async function finishBatch (args, context) {
  const { entityId, plantId } = context.session

  const { workOrderId, batchId } = args

  const response = await workOrderService.finishBatch(context, entityId, plantId, workOrderId, batchId)

  return ApiResponseResult(response, 2000)
}

// export async function save (args, context) {
//   const { entityId, plantId } = context.session

//   const { status, data } = args

//   const Result = await workOrderService.save(
//     context,
//     entityId,
//     plantId,
//     data,
//     status
//   )

//   return ApiResponseResult(Result, 2000)
// }

// export async function selectLotsForBatch (args, context) {
//   const { entityId, plantId } = context.session

//   const { materials } = args

//   const Result = await workOrderService.selectLotsForBatch(
//     context,
//     entityId,
//     plantId,
//     materials
//   )

//   return ApiResponseResult(Result, 2000)
// }

// export async function selectLotsForBatchMaterial (args, context) {
//   const { entityId, plantId } = context.session

//   const { productId, vendorId } = args

//   const Result = await workOrderService.selectLotsForBatchMaterial(
//     context,
//     entityId,
//     plantId,
//     productId,
//     vendorId
//   )

//   return ApiResponseResult(Result, 2000)
// }

// export async function remove (args, context) {
//   const { entityId, plantId } = context.session

//   const { workOrderId } = args

//   const response = await workOrderRepository.deleteById(context, entityId, plantId, workOrderId)

//   return ApiResponseOk(response)
// }

// export async function listAll (args, context) {
//   const response = await workOrderRepository.listAll()

//   return ApiResponseOk(response)
// }
