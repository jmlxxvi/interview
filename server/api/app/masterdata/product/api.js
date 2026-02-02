import { ApiResponseOk, ApiResponseResult } from '../../../../utils/response.js'
import { productRepository } from '../../../../repositories/product.js'
import { productService } from '../../../../services/product.js'
// import { uuid } from '../../../../utils/index.js'

export async function list (args, context) {
  const { entityId, plantId } = context.session
  console.log('entityId, plantId: ', entityId, plantId)

  const { search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10 } = args

  const Result = await productRepository.tablePaginated(entityId, plantId, search, orderCol, orderDir, page, size)

  return ApiResponseOk(Result)
};

export async function findAll (_args, context) {
  const { entityId, plantId } = context.session
  console.log('entityId, plantId: ', entityId, plantId)

  const Result = await productRepository.findAll(context, entityId, plantId)

  return ApiResponseOk(Result)
}

export async function findById (args, context) {
  const { entityId, plantId } = context.session

  const { productId } = args

  const response = await productRepository.findById(context, entityId, plantId, productId)

  return ApiResponseOk(response)
};

export async function findByNameOrCode (args, context) {
  const { entityId, plantId } = context.session

  const { search, isOwn } = args
  console.log('search: ', search)

  const response = await productRepository.findByNameOrCode(context, entityId, plantId, search, isOwn)

  return ApiResponseOk(response)
}

export async function getProductDetails (args, context) {
  const { entityId, plantId } = context.session

  const { productId } = args
  console.log('productId: ', productId)

  const response = await productRepository.getProductDetails(context, entityId, plantId, productId)

  return ApiResponseOk(response)
}

// export async function saveOld (args, context) {
//   const { productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, vendorsList } = args
//   console.log('args: ', args)

//   // saveProduct (context, productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, vendorsList)

//   if (productId) {
//     const Result = await productService.update(
//       context,
//       productId,
//       code,
//       name,
//       description,
//       unitOfMeasureId,
//       shelfLifeDays,
//       isOwn || false,
//       vendorsList
//     )

//     return ApiResponseResult(Result, 2000)
//   } else {
//     const Result = await productService.create(
//       context,
//       uuid(),
//       code,
//       name,
//       description,
//       unitOfMeasureId,
//       shelfLifeDays,
//       isOwn || false,
//       vendorsList
//     )

//     return ApiResponseResult(Result, 2000)
//   }
// };

export async function save (args, context) {
  const { entityId, plantId } = context.session

  const data = args

  const Result = await productService.save(
    context,
    entityId,
    plantId,
    data
  )

  return ApiResponseResult(Result, 2000)
}

export async function remove (args, context) {
  const { entityId, plantId } = context.session

  const { productId } = args

  const response = await productRepository.deleteById(context, entityId, plantId, productId)

  return ApiResponseOk(response)
};

// Vendor management for products
export async function addVendor (args, context) {
  const { entityId, plantId } = context.session

  const { productId, vendorId, vendorProductCode, leadTimeDays, isPreferred } = args

  const response = await productRepository.addVendor(
    context,
    entityId,
    plantId,
    productId,
    vendorId,
    vendorProductCode,
    leadTimeDays,
    isPreferred
  )

  return ApiResponseOk(response)
};

export async function updateVendor (args, context) {
  const { entityId, plantId } = context.session

  const { productVendorId, vendorProductCode, leadTimeDays, isPreferred } = args

  const response = await productRepository.updateVendor(
    context,
    entityId,
    plantId,
    productVendorId,
    vendorProductCode,
    leadTimeDays,
    isPreferred
  )

  return ApiResponseOk(response)
};

export async function mergeVendor (args, context) {
  const { entityId, plantId } = context.session

  const { productId, vendorId, vendorProductCode, leadTimeDays, isPreferred } = args

  const response = await productRepository.mergeVendor(
    context,
    entityId,
    plantId,
    productId,
    vendorId,
    vendorProductCode,
    leadTimeDays,
    isPreferred
  )

  return ApiResponseOk(response)
}

export async function removeVendor (args, context) {
  const { entityId, plantId } = context.session

  const { productVendorId } = args

  const response = await productRepository.removeVendor(context, entityId, plantId, productVendorId)

  return ApiResponseOk(response)
};

export async function listVendors (args, context) {
  const { entityId, plantId } = context.session

  const { productId } = args

  const response = await productRepository.getVendors(context, entityId, plantId, productId)

  return ApiResponseOk(response)
};

// BOM (Bill of Materials) management for products
export async function getBOM (args, context) {
  const { entityId, plantId } = context.session

  const { productId } = args
  console.log('productId getBOM: ', productId)

  const response = await productRepository.getBOM(context, entityId, plantId, productId)

  return ApiResponseOk(response)
};

export async function createBOM (args, context) {
  const { entityId, plantId } = context.session

  const { productId, version } = args

  const response = await productRepository.createBOM(context, entityId, plantId, productId, version)

  return ApiResponseOk(response)
};

export async function removeBOM (args, context) {
  const { entityId, plantId } = context.session

  const { bomId } = args

  const response = await productRepository.removeBOM(context, entityId, plantId, bomId)

  return ApiResponseOk(response)
}

export async function addBOMItem (args, context) {
  const { entityId, plantId } = context.session

  const { bomId, componentId, quantity, unitOfMeasureId } = args

  const response = await productRepository.addBOMItem(
    context,
    entityId,
    plantId,
    bomId,
    componentId,
    quantity,
    unitOfMeasureId
  )

  return ApiResponseOk(response)
};

export async function updateBOMItem (args, context) {
  const { entityId, plantId } = context.session

  const { bomItemId, quantity, unitOfMeasureId } = args

  const response = await productRepository.updateBOMItem(
    context,
    entityId,
    plantId,
    bomItemId,
    quantity,
    unitOfMeasureId
  )

  return ApiResponseOk(response)
};

export async function removeBOMItem (args, context) {
  const { entityId, plantId } = context.session

  const { bomId, bomItemId } = args

  const response = await productRepository.removeBOMItem(context, entityId, plantId, bomId, bomItemId)

  return ApiResponseOk(response)
};

// Routing management for products
export async function getRouting (args, context) {
  const { entityId, plantId } = context.session

  const { productId } = args

  const response = await productRepository.getRouting(context, entityId, plantId, productId)

  return ApiResponseOk(response)
};

export async function createRouting (args, context) {
  const { entityId, plantId } = context.session

  const { productId, version } = args

  const response = await productRepository.createRouting(context, entityId, plantId, productId, version)

  return ApiResponseOk(response)
};

export async function removeRouting (args, context) {
  const { entityId, plantId } = context.session

  const { routingId } = args

  const response = await productRepository.removeRouting(context, entityId, plantId, routingId)

  return ApiResponseOk(response)
};

export async function addRoutingOperation (args, context) {
  const { entityId, plantId } = context.session

  const { routingId, operationId, equipmentId, sequence, requiresQualityControl } = args

  const response = await productRepository.addRoutingOperation(
    context,
    entityId,
    plantId,
    routingId,
    operationId,
    equipmentId,
    sequence,
    requiresQualityControl
  )

  return ApiResponseOk(response)
};

export async function updateRoutingOperation (args, context) {
  const { entityId, plantId } = context.session

  const { routingOperationId, equipmentId, sequence, requiresQualityControl } = args

  const response = await productRepository.updateRoutingOperation(
    context,
    entityId,
    plantId,
    routingOperationId,
    equipmentId,
    sequence,
    requiresQualityControl
  )

  return ApiResponseOk(response)
};

export async function removeRoutingOperation (args, context) {
  const { entityId, plantId } = context.session

  const { routingId, routingOperationId } = args

  const response = await productRepository.removeRoutingOperation(context, entityId, plantId, routingId, routingOperationId)

  return ApiResponseOk(response)
};
