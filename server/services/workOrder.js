// services/userService.js
import { db } from '../platform/db/index.js'
import log from '../platform/log.js'
import { Result } from '../utils/result.js'
import { timestamp, uuid } from '../utils/index.js'

import { lotRepository } from '../repositories/lot.js'
import { batchRepository } from '../repositories/batch.js'
import { workOrderRepository } from '../repositories/workOrder.js'
import { batchOperationRepository } from '../repositories/batchOperation.js'
import { batchMaterialRepository } from '../repositories/batchMaterial.js'
import { inventoryItemRepository } from '../repositories/inventoryItem.js'
import { qualityControlRepository } from '../repositories/qualityControl.js'
import { productRepository } from '../repositories/product.js'
import { inventoryReservationRepository } from '../repositories/inventoryReservation.js'
// import { plannedReservationRepository } from '../repositories/plannedReservation.js'

import { inventoryService } from './inventory.js'
import { webSocketsService } from './webSockets.js'

import { generateEntityCode } from '../services/utils.js'
import { plannedSupplyRepository } from '../repositories/plannedSupply.js'
import { plannedReservationRepository } from '../repositories/plannedReservation.js'

const selectLotsForBatch = async (context, entityId, plantId, materials) => {
  const lotsSelection = []

  for (const material of materials) {
    const selectLotsFEFOData = await inventoryService.selectLotsFEFO({
      context,
      entityId,
      plantId,
      productId: material.componentId,
      vendorId: material.vendorId,
      requiredQuantity: material.requiredQuantity
    })

    lotsSelection.push({
      materialId: material.id,
      componentId: material.componentId,
      ...selectLotsFEFOData
    })
  }

  return Result.ok(lotsSelection)
}

const selectLotsForBatchMaterial = async (context, entityId, plantId, productId, vendorId) => {
  const selectLotsFEFOData = await inventoryItemRepository.findByProduct(
    context,
    entityId,
    plantId,
    productId,
    vendorId
  )

  return Result.ok(selectLotsFEFOData.filter(lot => lot.totalQty > 0))
  // return Result.ok(selectLotsFEFOData)
}

const selectPlannedForBatchMaterial = async (context, entityId, plantId, productId, vendorId) => {
  const plannedLotsData = await plannedSupplyRepository.findByProduct(
    context,
    entityId,
    plantId,
    productId,
    vendorId
  )

  console.log('plannedLotsData: ', plannedLotsData)

  return Result.ok(plannedLotsData)
}

const getLotsForProduct = async (context, entityId, plantId, productId, vendorId, client) => {
  const selectLotsFEFOData = await inventoryItemRepository.findByProduct({
    context,
    entityId,
    plantId,
    productId,
    vendorId
  })

  return Result.ok(selectLotsFEFOData)
}

const clone = async (context, entityId, plantId, workOrderId) => {
  const client = await db.acquireClient()

  try {
    await db.begin(client)

    // Get the original work order details
    const originalWorkOrder = await workOrderRepository.getWorkOrderDetails(
      context,
      entityId,
      plantId,
      workOrderId,
      client
    )

    if (!originalWorkOrder || !originalWorkOrder.workOrder) {
      return Result.fail('Work order not found')
    }

    const { workOrder, batches } = originalWorkOrder
    const originalStatus = workOrder.status

    // Generate new codes
    const newWorkOrderCode = await generateEntityCode('WOR')
    const newWorkOrderId = uuid()

    // Determine target status based on original order status
    let targetStatus = 'DRAFT'
    let shouldReserveInventory = false

    if (originalStatus !== 'DRAFT') {
      shouldReserveInventory = true
      targetStatus = 'WAITING_FOR_MATERIALS' // Default, will be updated if all materials are available
    }

    // Create the new work order initially with DRAFT status
    await workOrderRepository.create(
      context,
      entityId,
      plantId,
      newWorkOrderId,
      newWorkOrderCode,
      workOrder.workCenterId,
      workOrder.productId,
      workOrder.quantity,
      workOrder.assignedEmployeeId,
      workOrder.plannedStart,
      workOrder.plannedEnd,
      'DRAFT',
      client
    )

    let allMaterialsAvailable = true
    const batchesData = []

    // Clone batches if they exist
    if (batches && batches.length > 0) {
      for (const batch of batches) {
        const newBatchId = uuid()
        const newBatchCode = await generateEntityCode('BATCH')

        // Create batch
        await batchRepository.create(
          context,
          entityId,
          plantId,
          newBatchId,
          newBatchCode,
          newWorkOrderId,
          batch.assignedEmployeeId,
          'PENDING',
          batch.quantity,
          batch.plannedStartDate,
          batch.plannedEndDate,
          batch.routingId,
          batch.bomId,
          batch.requiresQualityControl,
          client
        )

        // Clone operations
        if (batch.operations && batch.operations.length > 0) {
          for (const [index, operation] of batch.operations.entries()) {
            await batchOperationRepository.create(
              context,
              entityId,
              plantId,
              uuid(),
              newBatchId,
              operation.operationId,
              operation.equipmentId,
              operation.operatorId,
              index + 1,
              'PENDING',
              operation.notes,
              client
            )
          }
        }

        // Clone materials and prepare for inventory reservation
        const batchMaterials = []
        if (batch.materials && batch.materials.length > 0) {
          for (const material of batch.materials) {
            const newMaterialId = uuid()
            await batchMaterialRepository.create(
              context,
              entityId,
              plantId,
              newMaterialId,
              newBatchId,
              material.bomItemId,
              material.componentId,
              material.quantity,
              material.unitOfMeasureId,
              material.vendorId,
              'PENDING',
              material.notes,
              client
            )

            batchMaterials.push({
              id: newMaterialId,
              componentId: material.componentId,
              vendorId: material.vendorId,
              quantity: material.quantity,
              unitOfMeasureId: material.unitOfMeasureId
            })
          }
        }

        batchesData.push({
          id: newBatchId,
          code: newBatchCode,
          materials: batchMaterials
        })
      }
    }

    // If original order was not DRAFT, try to reserve inventory
    if (shouldReserveInventory && batchesData.length > 0) {
      for (const batchData of batchesData) {
        for (const material of batchData.materials) {
          // Select lots using FEFO
          const selectLotsFEFOData = await inventoryService.selectLotsFEFO({
            context,
            entityId,
            plantId,
            productId: material.componentId,
            vendorId: material.vendorId,
            requiredQuantity: material.quantity
          })

          // Check if there's a shortage
          if (selectLotsFEFOData.shortage > 0) {
            allMaterialsAvailable = false
          }

          // Lock inventory items for reservation
          if (selectLotsFEFOData.picks && selectLotsFEFOData.picks.length > 0) {
            await inventoryService.lockInventoryItems(
              entityId,
              plantId,
              selectLotsFEFOData.picks.map(p => p.inventoryItemId),
              client
            )

            // Create reservations for each pick
            for (const pick of selectLotsFEFOData.picks) {
              await inventoryService.reserveInventory({
                entityId,
                plantId,
                inventoryItemId: pick.inventoryItemId,
                batchId: batchData.id,
                quantity: pick.pickQty,
                unitId: material.unitOfMeasureId,
                reservedBy: context.session.userId,
                notes: `Reservation for cloned Work Order ${newWorkOrderCode}, Batch ${batchData.code}`
              }, client)
            }
          }
        }
      }

      // Update target status based on inventory availability
      if (allMaterialsAvailable) {
        targetStatus = 'READY_TO_START'
      } else {
        targetStatus = 'WAITING_FOR_MATERIALS'
      }
    }

    // Update work order to final status if not DRAFT
    if (targetStatus !== 'DRAFT') {
      await workOrderRepository.updateStatus(
        context,
        entityId,
        plantId,
        newWorkOrderId,
        targetStatus,
        client
      )
    }

    await webSocketsService.broadcastMessage(entityId, plantId, {
      context: 'entity-modified',
      data: {
        name: 'workOrder',
        id: newWorkOrderId
      }
    }, context.token)

    await db.commit(client)
    return Result.ok({
      workOrderId: newWorkOrderId,
      workOrderCode: newWorkOrderCode,
      status: targetStatus,
      allMaterialsAvailable
    })
  } catch (error) {
    log.error(error, 'workOrder clone', context.execId)
    await db.rollback(client)
    return Result.fail(`Error cloning work order: ${error.message}`)
  } finally {
    await db.releaseClient(client)
  }
}

const save = async (context, entityId, plantId, data, status) => {
  if (!['DRAFT', 'WAITING_FOR_MATERIALS', 'READY_TO_START'].includes(status)) {
    return Result.fail(`Cannot set work order to status ${status} using this operation.`)
  }

  const client = await db.acquireClient()

  try {
    const operationType = data.workOrder.id ? 'UPDATE' : 'CREATE'

    const workOrderId = data.workOrder.id || uuid()

    await db.begin(client)

    if (operationType === 'CREATE') {
      await workOrderRepository.create(
        context,
        entityId,
        plantId,
        workOrderId,
        data.workOrder.code,
        data.workOrder.workCenterId,
        data.workOrder.productId,
        data.workOrder.quantity,
        data.workOrder.assignedEmployeeId,
        data.workOrder.plannedStart,
        data.workOrder.plannedEnd,
        status,
        client
      )
    } else {
      await workOrderRepository.update(
        context,
        entityId,
        plantId,
        workOrderId,
        data.workOrder.code,
        data.workOrder.workCenterId,
        data.workOrder.productId,
        data.workOrder.quantity,
        data.workOrder.assignedEmployeeId,
        data.workOrder.plannedStart,
        data.workOrder.plannedEnd,
        status,
        client
      )
    }

    if (['WAITING_FOR_MATERIALS', 'READY_TO_START'].includes(status)) {
      // Batches
      // TODO refactor to use the batch repository?
      await db.query('DELETE FROM interview.batch WHERE work_order_id = $1', [workOrderId], client)

      for (const batch of data.batches) {
      // Create batch
        await batchRepository.create(
          context,
          entityId,
          plantId,
          batch.id,
          batch.batchCode,
          workOrderId,
          batch.assignedEmployeeId,
          batch.status,
          batch.quantity,
          batch.plannedStart,
          batch.plannedEnd,
          batch.routingId,
          batch.bomId,
          batch.requiresQualityControl,
          client
        )

        // Quality Controls
        if (batch.requiresQualityControl) {
          qualityControlRepository.create(
            context,
            entityId,
            plantId,
            batch.id,
            null,
            null,
            null,
            client
          ) // const create = async (context, entityId, plantId, batchId, inspectedBy, result, notes, client = null)
        }

        for (const [index, operation] of batch.operations.entries()) {
          await batchOperationRepository.create(
            context,
            entityId,
            plantId,
            uuid(),
            batch.id,
            operation.operationId,
            operation.equipmentId,
            operation.operatorId,
            index + 1,
            operation.status,
            operation.notes,
            client
          )
        }

        // Lock inventory items for reservation
        await inventoryService.lockInventoryItems(entityId, plantId, batch.materials.map(m => m.inventoryItemId), client)

        for (const material of batch.materials) {
          await batchMaterialRepository.create(
            context,
            entityId,
            plantId,
            material.id,
            batch.id,
            material.bomItemId,
            material.componentId,
            material.quantity,
            material.unitOfMeasureId,
            material.vendorId,
            'PENDING',
            null,
            client
          )

          // Make inventory reservations for the batch
          const materialPicks = material.picks

          for (const pick of materialPicks) {
            await inventoryService.reserveInventory({
              entityId,
              plantId,
              inventoryItemId: pick.inventoryItemId,
              batchId: batch.id,
              quantity: pick.pickQty,
              unitId: material.unitOfMeasureId,
              reservedBy: context.session.userId,
              notes: `Reservation for Work Order ${data.workOrder.code}, Batch ${batch.batchCode}`
            }, client)
          }

          // Make planning reservations for the batch
          const materialPlans = material.plans || []

          for (const plan of materialPlans) {
            console.log('plan: ', JSON.stringify(plan, null, 2))
            await plannedReservationRepository.createPlannedReservation(
              context, entityId, plantId, batch.id, plan.plannedSupplyId, plan.pickQty, client
            )
          }
        } // Materials loop
      } // Batches loop
    }

    await webSocketsService.broadcastMessage(entityId, plantId, {
      context: 'entity-modified',
      data: {
        name: 'workOrder',
        id: workOrderId
      }
    }, context.token)

    await db.commit(client)
    return Result.ok()
  } catch (error) {
    log.error(error, 'workOrder save', context.execId)
    await db.rollback(client)
    return Result.fail(`Error saving work order: ${error.message}`)
  } finally {
    await db.releaseClient(client)
  }
}

const removeWorkOrder = async (context, entityId, plantId, workOrderId) => {
  // console.log('data: ', JSON.stringify(data, null, 2))

  // TODO findById
  const workOrderData = await workOrderRepository.findById(context, entityId, plantId, workOrderId)

  try {
    const workOrderStatus = workOrderData.status
    const workOrderPlannedStart = workOrderData.plannedStart

    if (!['DRAFT', 'WAITING_FOR_MATERIALS'].includes(workOrderStatus)) {
      return Result.fail(`Cannot delete a Work Order in state of ${workOrderStatus}.`)
    }

    if (workOrderStatus === 'READY_TO_START' && workOrderPlannedStart < timestamp()) {
      return Result.fail(`The Work Order is in state of ${workOrderStatus} and its planned start is in the past.`)
    }

    workOrderRepository.deleteById(context, entityId, plantId, workOrderId)
    return Result.ok()
  } catch (error) {
    log.error(error, 'workOrder remove', context.execId)
    return Result.fail(`Error removing work order: ${error.message}`)
  }
}

const startBatchOperation = async (context, entityId, plantId, workOrderId, batchId, operationId) => {
  const client = await db.acquireClient()

  try {
    await db.begin(client)

    const workOrder = await workOrderRepository.findById(context, entityId, plantId, workOrderId, client)
    console.log('workOrder: ', JSON.stringify(workOrder, null, 2))

    const batch = await batchRepository.findById(context, entityId, plantId, batchId, client)
    console.log('batch: ', JSON.stringify(batch, null, 2))

    console.log('operationId: ', operationId)
    const operation = await batchOperationRepository.findById(context, entityId, plantId, operationId, client)
    console.log('operation: ', JSON.stringify(operation, null, 2))

    if (workOrder.status !== 'READY_TO_START' && workOrder.status !== 'RUNNING') {
      return Result.fail(`Work Order is not ready to start.<br>Current status: ${workOrder.status}`)
    }

    if (batch.status !== 'PENDING' && batch.status !== 'RUNNING') {
      return Result.fail(`Only batches in state of PENDING can be started.<br>Current status: ${batch.status}`)
    }

    if (workOrder.status !== 'RUNNING') {
      workOrderRepository.updateStatus(context, entityId, plantId, workOrderId, 'RUNNING', client)
      workOrderRepository.setStartTime(context, entityId, plantId, workOrderId, timestamp(), client)
    }

    if (batch.status !== 'RUNNING') {
      batchRepository.updateStatus(context, entityId, plantId, batchId, 'RUNNING', client)
      batchRepository.setStartTime(context, entityId, plantId, batchId, timestamp(), client)
    }

    if (operation.status !== 'RUNNING') {
      batchOperationRepository.updateStatus(context, entityId, plantId, operationId, 'RUNNING', client)
      batchOperationRepository.setStartTime(context, entityId, plantId, operationId, timestamp(), client)
    }

    await db.commit(client)
    return Result.ok()
  } catch (error) {
    log.error(error, 'startBatchOperation', context.execId)
    await db.rollback(client)
    return Result.fail(`Error starting batch: ${error.message}`)
  } finally {
    await db.releaseClient(client)
  }
}

const completeBatchOperation = async (context, entityId, plantId, workOrderId, batchId, operationId) => {
  const client = await db.acquireClient()

  try {
    await db.begin(client)

    const workOrder = await workOrderRepository.findById(context, entityId, plantId, workOrderId, client)
    console.log('workOrder: ', JSON.stringify(workOrder, null, 2))

    const batch = await batchRepository.findById(context, entityId, plantId, batchId, client)
    console.log('batch: ', JSON.stringify(batch, null, 2))

    console.log('operationId: ', operationId)
    const operation = await batchOperationRepository.findById(context, entityId, plantId, operationId, client)
    console.log('operation: ', JSON.stringify(operation, null, 2))

    if (workOrder.status !== 'RUNNING') {
      return Result.fail(`Work Order is not running.<br>Current status: ${workOrder.status}`)
    }

    if (batch.status !== 'RUNNING') {
      return Result.fail(`Only operations for batches in state of RUNNING can be completed.<br>Current status: ${batch.status}`)
    }

    if (operation.status !== 'RUNNING') {
      return Result.fail(`Only operations in state of RUNNING can be completed.<br>Current status: ${operation.status}`)
    }

    batchOperationRepository.updateStatus(context, entityId, plantId, operationId, 'COMPLETED', client)
    batchOperationRepository.setEndTime(context, entityId, plantId, operationId, timestamp(), client)

    await db.commit(client)
    return Result.ok()
  } catch (error) {
    log.error(error, 'startBatchOperation', context.execId)
    await db.rollback(client)
    return Result.fail(`Error starting batch: ${error.message}`)
  } finally {
    await db.releaseClient(client)
  }
}

const cancelBatchOperation = async (context, entityId, plantId, workOrderId, batchId, operationId) => {
  const client = await db.acquireClient()

  try {
    await db.begin(client)
    const workOrder = await workOrderRepository.findById(context, entityId, plantId, workOrderId, client)
    console.log('workOrder: ', JSON.stringify(workOrder, null, 2))

    const batch = await batchRepository.findById(context, entityId, plantId, batchId, client)
    console.log('batch: ', JSON.stringify(batch, null, 2))

    console.log('operationId: ', operationId)
    const operation = await batchOperationRepository.findById(context, entityId, plantId, operationId, client)
    console.log('operation: ', JSON.stringify(operation, null, 2))

    if (workOrder.status !== 'RUNNING') {
      return Result.fail(`Work Order is not running.<br>Current status: ${workOrder.status}`)
    }

    if (batch.status !== 'RUNNING') {
      return Result.fail(`Only operations for batches in state of RUNNING can be completed.<br>Current status: ${batch.status}`)
    }

    if (operation.status !== 'RUNNING') {
      return Result.fail(`Only operations in state of RUNNING can be completed.<br>Current status: ${operation.status}`)
    }

    batchOperationRepository.updateStatus(context, entityId, plantId, operationId, 'COMPLETED', client)
    batchOperationRepository.setEndTime(context, entityId, plantId, operationId, timestamp(), client)

    await db.commit(client)
    return Result.ok()
  } catch (error) {
    log.error(error, 'startBatchOperation', context.execId)
    await db.rollback(client)
    return Result.fail(`Error starting batch: ${error.message}`)
  } finally {
    await db.releaseClient(client)
  }
}

const passBatchQualityControl = async (context, entityId, plantId, qualityControlId, notes) => {
  await qualityControlRepository.setResult(context, entityId, plantId, qualityControlId, 'PASS', notes)
  return Result.ok()
}

const failBatchQualityControl = async (context, entityId, plantId, qualityControlId, notes) => {
  await qualityControlRepository.setResult(context, entityId, plantId, qualityControlId, 'FAIL', notes)
  return Result.ok()
}

const finishBatch = async (context, entityId, plantId, workOrderId, batchId) => {
  const client = await db.acquireClient()

  try {
    await db.begin(client)

    await batchRepository.updateStatus(context, entityId, plantId, batchId, 'COMPLETED', client)
    await batchRepository.setEndTime(context, entityId, plantId, batchId, timestamp(), client)

    const reservations = await inventoryReservationRepository.findByBatchId(context, entityId, plantId, batchId, client)
    console.log('reservations: ', JSON.stringify(reservations, null, 2))

    for (const reservation of reservations) {
      // Implement logic to start the batch operation using each reservation
      console.log('Processing reservation: ', JSON.stringify(reservation, null, 2))
      const cosumeResponse = await inventoryService.consumeReservation(context, entityId, plantId, reservation.id, client)
      console.log('cosumeResponse: ', cosumeResponse)
    }

    // Create lot for finished goods
    const batch = await batchRepository.findById(context, entityId, plantId, batchId, client)
    console.log('batch: ', JSON.stringify(batch, null, 2))

    const workOrder = await workOrderRepository.findById(context, entityId, plantId, workOrderId, client)
    console.log('workOrder: ', JSON.stringify(workOrder, null, 2))

    const product = await productRepository.findById(context, entityId, plantId, workOrder.productId, client)
    console.log('product: ', product)

    const lotCode = await generateEntityCode('LOT')
    const lotId = uuid()

    // TOOD make shelf life configurable per product and mandatory
    // or find a better approach to determine expiration date
    const expirationTimestamp = product.shelfLifeDays
      ? timestamp() + (product.shelfLifeDays * 24 * 60 * 60 * 1000)
      : timestamp() + (60 * 60 * 24 * 365 * 1000) // Default to 1 year if no shelf life is defined

    console.log('expirationTimestamp: ', expirationTimestamp)
    const lotCreationResponse = await lotRepository.create(
      context,
      entityId,
      plantId,
      lotId,
      batchId,
      workOrder.productId,
      lotCode,
      batch.quantity,
      batch.actualEnd,
      expirationTimestamp,
      product.vendorId,
      true,
      client
    )
    console.log('lotCreationResponse: ', JSON.stringify(lotCreationResponse, null, 2))

    const receiveToInventoryResponse = await inventoryService.receiveToInventory(
      context,
      entityId,
      plantId,
      workOrder.productId,
      lotId,
      lotCode,
      product.vendorId,
      expirationTimestamp,
      batch.quantity,
      '74711618-793e-4af4-9196-e7332fba5a06', // TODO well... hardcoded value...
      'FINISHED',
      null,
      undefined,
      'PRODUCTION',
      workOrderId,
      client
    )

    console.log('receiveToInventoryResponse: ', receiveToInventoryResponse)

    // Check if all batches are completed to possibly complete the work order
    const batches = await batchRepository.findByWorkOrderId(context, entityId, plantId, workOrderId, client)

    const allBatchesCompleted = batches.every(b => b.status === 'COMPLETED')

    if (allBatchesCompleted) {
      await workOrderRepository.updateStatus(context, entityId, plantId, workOrderId, 'COMPLETED', client)
      await workOrderRepository.setEndTime(context, entityId, plantId, workOrderId, timestamp(), client)
      await db.commit(client)
      return Result.ok('Work Order completed successfully.')
    }

    await db.commit(client)
    return Result.ok('Batch completed successfully.')
  } catch (error) {
    log.error(error, 'finishBatch', context.execId)
    await db.rollback(client)
    return Result.fail(`Error finishing batch: ${error.message}`)
  } finally {
    await db.releaseClient(client)
  }
}

export const workOrderService = {
  selectLotsForBatch,
  selectLotsForBatchMaterial,
  selectPlannedForBatchMaterial,
  getLotsForProduct,
  save,
  clone,
  removeWorkOrder,
  startBatchOperation,
  completeBatchOperation,
  cancelBatchOperation,
  passBatchQualityControl,
  failBatchQualityControl,
  finishBatch
}

/*

         // Step 1 - FEFO pick
          const selectLotsFEFOData = await inventoryService.selectLotsFEFO({
            context,
            entityId,
            plantId,
            productId: material.componentId,
            vendorId: material.vendorId,
            requiredQuantity: material.quantity * batch.quantity
          })
          console.log('selectLotsFEFOData ---------------------: ', selectLotsFEFOData)
          // if (selectLotsFEFOData.shortage > 0) {

          // }

          FEFOData.push({
            batchId: batch.id,
            vendorId: material.vendorId,
            vendorName: material.vendorName,
            componentId: material.componentId,
            componentCode: material.componentCode,
            componentName: material.componentName,
            shortage: selectLotsFEFOData.shortage,
            unitOfMeasureId: material.unitOfMeasureId,
            unitOfMeasureCode: material.unitOfMeasureCode,
            ...selectLotsFEFOData
          })
      FEFOData:  [
  {
    "batchId": "6aebdd31-7796-436e-a5ac-987263d3ae07",
    "vendorId": "8a6e4ab9-596f-487a-aefe-d7b9000d65c9",
    "vendorName": "Coca Cola2",
    "componentId": "352ba3e2-1d55-45a9-a4b9-a52887099640",
    "componentCode": "PRD-0443",
    "componentName": "Leche entera",
    "shortage": 55,
    "unitOfMeasureId": "a9611e17-8047-42b2-a7f6-53dfbaaf33f2",
    "unitOfMeasureCode": "L",
    "picks": [
      {
        "productId": "352ba3e2-1d55-45a9-a4b9-a52887099640",
        "vendorId": "8a6e4ab9-596f-487a-aefe-d7b9000d65c9",
        "inventoryItemId": "549928a4-e819-450b-b7fd-59330fe5a382",
        "lotId": "34727484-c2b5-4ee6-a0b4-0fbcd3de4af7",
        "locationId": "ee97da3e-81f8-437e-9abc-df1d7a8ca599",
        "availableQty": 99,
        "pickQty": 99
      }
    ]
  }
]
      */

// console.log('FEFOData: ', JSON.stringify(FEFOData, null, 2))
// const shortages = FEFOData.filter(f => f.shortage > 0)
// // Analyze inventory picks and create reservations
// console.log('shortages: ', shortages)
// // Step 1 - Check for shortages
// if (shortages.length > 0) {
//   const message = shortages.map(s => `Material ${s.componentCode} - ${s.componentName} from Vendor ${s.vendorName} has a shortage of ${s.shortage} ${s.unitOfMeasureCode}`).join('; ')
//   await db.rollback(client)
//   return Result.fail(`Insufficient inventory: ${message}`)
// } else {
//   // Step 2 - Create reservations
//   for (const selectedLots of FEFOData) {
//     for (const pick of selectedLots.picks) {
//       await inventoryService.reserveInventory({
//         entityId,
//         plantId,
//         inventoryItemId: pick.inventoryItemId,
//         batchId: selectedLots.batchId,
//         quantity: pick.pickQty,
//         unitId: pick.unitOfMeasureId,
//         reservedBy: context.session.userId,
//         notes: `Reservation for Work Order Batch ${batch.batchCode}`
//       }, client)

//     await inventoryService.createInventoryReservation(
//       context,
//       pick.inventoryItemId,
//       pick.lotId,
//       pick.locationId,
//       pick.pickQty,
//       'WORK_ORDER_BATCH_RESERVATION',
//       batch.id,
//       client
//     )
//     }
//   }
// }
// console.log('shortages: ', shortages)
// if (shortages.length > 0) {
//   const message = shortages.map(s => `Material ${s.productId} (${s.vendorId}) has a shortage of ${s.shortage}`).join('; ')
//   await db.rollback(client)
//   return Result.fail(`Insufficient inventory. ${message}`)
// }
