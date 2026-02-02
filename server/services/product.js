import { db } from '../platform/db/index.js'
import log from '../platform/log.js'
// services/userService.js
import { productRepository } from '../repositories/product.js'
import { uuid } from '../utils/index.js'
// import { vendorRepository } from '../repositories/vendor.js'
import { Result } from '../utils/result.js'

async function create (context, productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, vendorsList) {
  const client = await db.acquireClient()

  try {
    await productRepository.create(context, productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, client)

    for (const vendorEntry of vendorsList) {
      await productRepository.mergeVendor(
        context,
        productId,
        vendorEntry.vendorId,
        vendorEntry.vendorProductCode,
        vendorEntry.leadTimeDays,
        vendorEntry.isPreferred,
        client
      )
    }

    db.commit(client)
    return Result.ok()
  } catch (error) {
    db.rollback(client)
    return Result.fail(`Error saving product: ${error.message}`)
  } finally {
    db.releaseClient(client)
  }
}

async function update (context, productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, vendorsList) {
  const client = await db.acquireClient()

  try {
    await productRepository.update(context, productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, client)

    for (const vendorEntry of vendorsList) {
      await productRepository.mergeVendor(
        context,
        productId,
        vendorEntry.vendorId,
        vendorEntry.vendorProductCode,
        vendorEntry.leadTimeDays,
        vendorEntry.isPreferred,
        client
      )
    }

    db.commit(client)
    return Result.ok()
  } catch (error) {
    db.rollback(client)
    return Result.fail(`Error saving product: ${error.message}`)
  } finally {
    db.releaseClient(client)
  }
}

async function save (context, entityId, plantId, data) {
  const client = await db.acquireClient()

  const productId = data.product.productId || uuid()

  try {
    if (data.product.productId) {
      await productRepository.update(
        context,
        entityId,
        plantId,
        productId,
        data.product.productCode,
        data.product.productName,
        data.product.description,
        data.product.unitOfMeasureId,
        data.product.shelfLifeDays,
        data.product.isOwn || false,
        client
      )
    } else {
      await productRepository.create(
        context,
        entityId,
        plantId,
        productId,
        data.product.productCode,
        data.product.productName,
        data.product.description,
        data.product.unitOfMeasureId,
        data.product.shelfLifeDays,
        data.product.isOwn || false,
        client
      )
    }
    await productRepository.removeProductVendors(context, entityId, plantId, productId, client)
    await productRepository.removeProductRoutings(context, entityId, plantId, productId, client)
    await productRepository.removeProductBOMs(context, entityId, plantId, productId, client)

    for (const vendorEntry of data.vendors) {
      await productRepository.addVendor(
        context,
        entityId,
        plantId,
        productId,
        vendorEntry.vendorId,
        vendorEntry.vendorProductCode,
        vendorEntry.leadTimeDays,
        vendorEntry.isPreferred,
        client
      )
    }

    // Routing
    for (const routingEntry of data.routings) {
      const routingId = routingEntry.routingId || uuid()

      console.log('productId: ', productId)
      await productRepository.createRouting(
        context,
        entityId,
        plantId,
        routingId,
        productId,
        routingEntry.version,
        client
      )

      for (const operation of routingEntry.operations) {
        await productRepository.addRoutingOperation(
          context,
          entityId,
          plantId,
          routingId,
          operation.operationId,
          operation.equipmentId,
          1,
          operation.requiresQualityControl,
          client
        )
      }
    }

    // BOMs
    for (const bomEntry of data.boms) {
      const bomId = bomEntry.bomId || uuid()
      await productRepository.createBOM(
        context,
        entityId,
        plantId,
        bomId,
        productId,
        bomEntry.version,
        client
      )

      for (const component of bomEntry.items) {
        await productRepository.addBOMItem(
          context,
          entityId,
          plantId,
          uuid(),
          bomId,
          component.componentId,
          component.quantity,
          component.unitOfMeasureId,
          component.vendorId,
          client
        )
      }
    }

    db.commit(client)

    return Result.ok()
  } catch (error) {
    log.error(error, 'productService.save', context.execId)
    db.rollback(client)

    return Result.fail(`Error saving product: ${error.message}`)
  } finally {
    db.releaseClient(client)
  }
}

export const productService = {
  // saveProduct
  save,
  create,
  update
}
