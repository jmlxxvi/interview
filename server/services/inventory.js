// src/services/inventoryService.js
import { db } from '../platform/db/index.js'
import { inventoryReservationRepository } from '../repositories/inventoryReservation.js'
import { lotRepository } from '../repositories/lot.js'
import { uuid, timestamp } from '../utils/index.js'

// ---------------------------
// Helpers (module-level)
// ---------------------------
// const nowTs = () => Math.floor(Date.now() / 1000)

// -------------------------
// Internal helpers
// -------------------------

async function _getReservedQuantity (entityId, plantId, inventoryItemId, client) {
  const res = await db.value(
        `SELECT COALESCE(SUM(quantity),0)::numeric AS reserved
       FROM interview.inventory_reservation
       WHERE inventory_item_id = $1 AND status = 'RESERVED'
       AND entity_id = $2 AND plant_id = $3`,
        [inventoryItemId, entityId, plantId],
        client
  )

  return parseFloat(res || 0)
}

async function _getInventoryItem (entityId, plantId, inventoryItemId, client) {
  console.log('entityId, plantId, inventoryItemId: ', entityId, plantId, inventoryItemId)
  const response = await db.row(
    'SELECT * FROM interview.inventory_item WHERE id = $1 AND entity_id = $2 AND plant_id = $3 FOR UPDATE',
    [inventoryItemId, entityId, plantId],
    client
  )
  console.log('response: ', response)
  return response
}

// TODO maybe we just may call inventoryItemRepository.findByProduct
async function _selectFefoLots (entityId, plantId, productId, vendorId, client) {
  /*
  SELECT id, product_id, lot_id, vendor_id, price, currency, quantity, expiration_at, location_id, "type", created_at, created_by, updated_at, updated_by, plant_id, entity_id
FROM interview.inventory_item;
  */
  const response = await db.query(
        `SELECT
              iit.id as inventory_item_id,
              iit.lot_id,
              iit.location_id,
              COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0) AS reserved_qty,
              (iit.quantity - COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0))::numeric AS available_qty,
              iit.quantity AS total_qty,
              lot.expiration_at
       FROM interview.inventory_item iit
       LEFT JOIN interview.inventory_reservation ire
              ON ire.inventory_item_id = iit.id AND ire.status='RESERVED'
       LEFT JOIN interview.lot lot ON lot.id = iit.lot_id
       WHERE iit.product_id = $1
       AND iit.vendor_id = $2
       -- Entity and plant filter
        AND iit.entity_id = $3
        AND iit.plant_id = $4
        AND (ire.entity_id = $3 OR ire.entity_id IS NULL)
        AND (ire.plant_id = $4 OR ire.plant_id IS NULL)
        AND (lot.entity_id = $3 OR lot.entity_id IS NULL)
        AND (lot.plant_id = $4 OR lot.plant_id IS NULL)
       GROUP BY iit.id, lot.expiration_at
       HAVING (iit.quantity - COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0)) > 0
       ORDER BY lot.expiration_at NULLS LAST, iit.created_at ASC`,
        [productId, vendorId, entityId, plantId],
        // [productId, vendorId],
        client
  )

  return response
}

// ------------------------------------------------------------
// Quantity checks
// ------------------------------------------------------------
async function getAvailableQuantity (inventoryItemId) {
  const client = db.acquireClient()
  try {
    const response = await db.value(
      'SELECT quantity FROM interview.inventory_item WHERE id = $1',
      [inventoryItemId],
      client
    )
    if (!response) return 0

    const qty = parseFloat(response || 0)

    const response2 = await db.value(
            `SELECT COALESCE(SUM(quantity),0) AS reserved
           FROM interview.inventory_reservation
           WHERE inventory_item_id = $1 AND status = 'RESERVED'`,
            [inventoryItemId],
            client
    )

    const reserved = parseFloat(response2 || 0)
    return qty - reserved
  } finally {
    db.releaseClient(client)
  }
}

// ------------------------------------------------------------
// Lock inventory items
// ------------------------------------------------------------
async function lockInventoryItems (entityId, plantId, inventoryItemIds, client) {
  // Implementation to lock inventory items for reservation
  for (const inventoryItemId of inventoryItemIds) {
    await db.query('select * from interview.inventory_item where id = $1  and entity_id = $2 and plant_id = $3 for update nowait', [inventoryItemId, entityId, plantId], client)
  }
}

// ------------------------------------------------------------
// Receive inventory
// ------------------------------------------------------------
async function receiveToInventory (
  context,
  entityId,
  plantId,
  productId,
  lotId,
  lotCode,
  vendorId,
  expirationDate,
  quantity,
  locationId,
  type = 'RAW',
  price,
  currency = 'USD',
  movementType = 'RECEIPT',
  workOrderId = null,
  client
) {
  const createdBy = context.session.userId

  // const {
  //   productId,
  //   lotId = null,
  //   lotCode = null,
  //   vendorId = null,
  //   expirationDate = null,
  //   quantity,
  //   //   unitId,
  //   locationId,
  //   type = 'RAW',
  //   price = null,
  //   currency = 'USD'
  // } = params

  // Check that either lotId or lotCode is provided
  if (!lotId && !lotCode) {
    throw new Error('Either lotId or lotCode must be provided')
  }

  let usedLotId = lotId

  // Create lot if needed
  // TODO use lot repository
  if (!usedLotId && lotCode) {
    usedLotId = uuid()
    const ts = timestamp()
    // TODO add vendorId to interview.lot table
    await db.query(
        `INSERT INTO interview.lot(
          id, 
          batch_id,
          product_id,
          code,
          quantity,
          manufactured_at,
          expiration_at,
          created_at,
          created_by,
          is_own_product,
          vendor_id,
          entity_id,
          plant_id
        )
        VALUES (
          $1,
          NULL,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          false,
          $9,
          $10,
          $11
        )
        RETURNING id`,
        [
          usedLotId,
          productId,
          lotCode,
          quantity,
          expirationDate,
          expirationDate,
          ts,
          createdBy,
          vendorId,
          entityId,
          plantId
        ],
        client
    )
    //   usedLotId = res.rows[0].id
  }

  // Try merging into existing inventory_item
  const find = await db.row(
            `SELECT *
           FROM interview.inventory_item
           WHERE product_id = $1
             AND COALESCE(lot_id::text,'') = COALESCE($2::text,'')
             AND COALESCE(vendor_id::text,'') = COALESCE($3::text,'')
             AND location_id = $4
             AND type = $5
             AND entity_id = $6
              AND plant_id = $7
           FOR UPDATE`,
            [productId, usedLotId, vendorId, locationId, type, entityId, plantId],
            client
  )

  let inventoryItem
  const ts = timestamp()

  if (find) {
    const row = find
    const newQty = parseFloat(row.quantity) + parseFloat(quantity)
    const upd = await db.query(
                `UPDATE interview.inventory_item
             SET quantity=$1, price=COALESCE($2,price), currency=COALESCE($3,currency),
                 updated_at=$4, updated_by=$5
             WHERE id=$6
             RETURNING *`,
                [newQty, price, currency, ts, createdBy, row.id],
                client
    )
    inventoryItem = upd
  } else {
    const ins = await db.query(
                `INSERT INTO interview.inventory_item
             (id, product_id, lot_id, vendor_id, price, currency, quantity,
              expiration_at, location_id, type, created_at, created_by, entity_id, plant_id)
             VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,NULL,$7,$8,$9,$10,$11,$12)
             RETURNING *`,
                [productId, usedLotId, vendorId, price, currency, quantity,
                  locationId, type, ts, createdBy, entityId, plantId],
                client
    )
    inventoryItem = ins
  }

  // Insert movement
  await db.query(
            `INSERT INTO interview.inventory_movement
           (id, inventory_item_id, movement_type, quantity,
            source_location_id, destination_location_id, reason,
            created_at, created_by, entity_id, plant_id, work_order_id)
           VALUES (gen_random_uuid(), $1,$2,$3,NULL,$4,'Receipt',$5,$6,$7,$8, $9)`,
            [inventoryItem.id, movementType, quantity, locationId, ts, createdBy, entityId, plantId, workOrderId],
            client
  )
}

// async function receiveToInventoryTx (
//   context,
//   entityId,
//   plantId,
//   productId,
//   lotId,
//   lotCode,
//   vendorId,
//   expirationDate,
//   quantity,
//   locationId,
//   type = 'RAW',
//   price,
//   currency = 'USD',
//   client
// ) {
//   client = client || await db.acquireClient()

//   try {
//     await db.begin(client)

//     const createdBy = context.session.userId

//     // const {
//     //   productId,
//     //   lotId = null,
//     //   lotCode = null,
//     //   vendorId = null,
//     //   expirationDate = null,
//     //   quantity,
//     //   //   unitId,
//     //   locationId,
//     //   type = 'RAW',
//     //   price = null,
//     //   currency = 'USD'
//     // } = params

//     // Check that either lotId or lotCode is provided
//     if (!lotId && !lotCode) {
//       throw new Error('Either lotId or lotCode must be provided')
//     }

//     let usedLotId = lotId

//     // Create lot if needed
//     // TODO use lot repository
//     if (!usedLotId && lotCode) {
//       usedLotId = uuid()
//       const ts = timestamp()
//       // TODO add vendorId to interview.lot table
//       await db.query(
//         `INSERT INTO interview.lot(
//           id,
//           batch_id,
//           product_id,
//           code,
//           quantity,
//           manufactured_at,
//           expiration_at,
//           created_at,
//           created_by,
//           is_own_product,
//           vendor_id,
//           entity_id,
//           plant_id
//         )
//         VALUES (
//           $1,
//           NULL,
//           $2,
//           $3,
//           $4,
//           $5,
//           $6,
//           $7,
//           $8,
//           false,
//           $9,
//           $10,
//           $11
//         )
//         RETURNING id`,
//         [
//           usedLotId,
//           productId,
//           lotCode,
//           quantity,
//           expirationDate,
//           expirationDate,
//           ts,
//           createdBy,
//           vendorId,
//           entityId,
//           plantId
//         ],
//         client
//       )
//     //   usedLotId = res.rows[0].id
//     }

//     // Try merging into existing inventory_item
//     const find = await db.row(
//             `SELECT *
//            FROM interview.inventory_item
//            WHERE product_id = $1
//              AND COALESCE(lot_id::text,'') = COALESCE($2::text,'')
//              AND COALESCE(vendor_id::text,'') = COALESCE($3::text,'')
//              AND location_id = $4
//              AND type = $5
//              AND entity_id = $6
//               AND plant_id = $7
//            FOR UPDATE`,
//             [productId, usedLotId, vendorId, locationId, type, entityId, plantId],
//             client
//     )

//     let inventoryItem
//     const ts = timestamp()

//     if (find) {
//       const row = find
//       const newQty = parseFloat(row.quantity) + parseFloat(quantity)
//       const upd = await db.query(
//                 `UPDATE interview.inventory_item
//              SET quantity=$1, price=COALESCE($2,price), currency=COALESCE($3,currency),
//                  updated_at=$4, updated_by=$5
//              WHERE id=$6
//              RETURNING *`,
//                 [newQty, price, currency, ts, createdBy, row.id],
//                 client
//       )
//       inventoryItem = upd
//     } else {
//       const ins = await db.query(
//                 `INSERT INTO interview.inventory_item
//              (id, product_id, lot_id, vendor_id, price, currency, quantity,
//               expiration_at, location_id, type, created_at, created_by, entity_id, plant_id)
//              VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,NULL,$7,$8,$9,$10,$11,$12)
//              RETURNING *`,
//                 [productId, usedLotId, vendorId, price, currency, quantity,
//                   locationId, type, ts, createdBy, entityId, plantId],
//                 client
//       )
//       inventoryItem = ins
//     }

//     // Insert movement
//     await db.query(
//             `INSERT INTO interview.inventory_movement
//            (id, inventory_item_id, movement_type, quantity,
//             source_location_id, destination_location_id, reason,
//             created_at, created_by, entity_id, plant_id)
//            VALUES (gen_random_uuid(), $1,'RECEIPT',$2,NULL,$3,'Receipt',$4,$5,$6,$7)`,
//             [inventoryItem.id, quantity, locationId, ts, createdBy, entityId, plantId],
//             client
//     )

//     await db.commit(client)
//     return inventoryItem
//   } catch (err) {
//     await db.rollback(client)
//     console.log('Error in receiveToInventory: ', err)
//     console.log('Error in receiveToInventory: ', err.stack)
//     throw err
//   } finally {
//     await db.releaseClient(client)
//   }
// }

// ------------------------------------------------------------
// Transfer
// ------------------------------------------------------------
async function transferInventory ({ inventoryItemId, quantity, destinationLocationId, createdBy }) {
  const client = await db.acquireClient()
  console.log('client: ', client)
  try {
    await db.begin(client)

    const src = await _getInventoryItem(inventoryItemId, client)
    console.log('src: ', src)
    if (!src) throw new Error('Source not found')

    const reserved = await _getReservedQuantity(inventoryItemId, client)
    const available = parseFloat(src.quantity) - reserved
    if (available < quantity) throw new Error('Insufficient available')

    // Update source
    const newSrcQty = parseFloat(src.quantity) - parseFloat(quantity)
    await db.query(
            `UPDATE interview.inventory_item
           SET quantity=$1, updated_at=$2, updated_by=$3 WHERE id=$4`,
            [newSrcQty, timestamp(), createdBy, inventoryItemId],
            client
    )

    // Find or create destination
    const destRes = await db.row(
            `SELECT *
           FROM interview.inventory_item
           WHERE product_id=$1
             AND COALESCE(lot_id::text,'') = COALESCE($2::text,'')
             AND COALESCE(vendor_id::text,'') = COALESCE($3::text,'')
             AND location_id=$4
             AND type=$5
           FOR UPDATE`,
            [src.product_id, src.lot_id, src.vendor_id, destinationLocationId, src.type],
            client
    )

    let destItem

    if (destRes) {
      destItem = destRes
      const updatedQty = parseFloat(destItem.quantity) + parseFloat(quantity)
      await db.query(
                `UPDATE interview.inventory_item
             SET quantity=$1, updated_at=$2, updated_by=$3 WHERE id=$4`,
                [updatedQty, timestamp(), createdBy, destItem.id],
                client
      )
    } else {
      const ins = await db.query(
                `INSERT INTO interview.inventory_item
             (id, product_id, lot_id, vendor_id, price, currency, quantity,
              expiration_at, location_id, type, created_at, created_by)
             VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
                [
                  src.productId, src.lotId, src.vendorId,
                  src.price, src.currency, quantity,
                  src.expirationAt, destinationLocationId, src.type,
                  timestamp(), createdBy
                ], client
      )
      destItem = ins
    }

    // Movement
    await db.query(
            `INSERT INTO interview.inventory_movement
           (id, inventory_item_id, movement_type, quantity,
            source_location_id, destination_location_id, reason,
            created_at, created_by)
           VALUES (gen_random_uuid(),$1,'TRANSFER',$2,$3,$4,'Transfer',$5,$6)`,
            [inventoryItemId, quantity, src.location_id, destinationLocationId, timestamp(), createdBy],
            client
    )

    await db.commit(client)
    return { source_item_id: inventoryItemId, destination_item: destItem }
  } catch (err) {
    await db.rollback(client)
    throw err
  } finally {
    await db.releaseClient(client)
  }
}

// ------------------------------------------------------------
// Reservation
// ------------------------------------------------------------
async function reserveInventory ({ entityId, plantId, inventoryItemId, batchId, quantity, unitOfMeasureId, reservedBy, notes }, client) {
  const ii = await _getInventoryItem(entityId, plantId, inventoryItemId, client)
  if (!ii) throw new Error('Inventory item not found')

  const reserved = await _getReservedQuantity(entityId, plantId, inventoryItemId, client)
  const available = parseFloat(ii.quantity) - reserved
  if (available < quantity) throw new Error('Insufficient available quantity')

  const ts = timestamp()

  const res = await db.query(
            `INSERT INTO interview.inventory_reservation
           (id, inventory_item_id, batch_id, quantity, unit_of_measure_id,
            reserved_at, reserved_by, status, notes, entity_id, plant_id)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,'RESERVED',$7,$8,$9)
           RETURNING *`,
            [inventoryItemId, batchId, quantity, unitOfMeasureId, ts, reservedBy, notes, entityId, plantId], client
  )

  return res
}

async function releaseReservation ({ entityId, plantId, reservationId, releasedBy }) {
  const client = db.acquireClient()
  try {
    await db.begin(client)

    const ts = timestamp()
    const response = await db.row(
            `UPDATE interview.inventory_reservation
           SET status='RELEASED', released_at=$1, released_by=$2
           WHERE id=$3 AND status='RESERVED'
           -- Entity and plant filter
            AND entity_id = $4 AND plant_id = $5
           RETURNING *`,
            [ts, releasedBy, reservationId, entityId, plantId], client
    )

    if (response.rowsAffected === 0) { throw new Error('Reservation not found or not RESERVED') }

    await db.commit(client)
    return response
  } catch (err) {
    await db.rollback(client)
    throw err
  } finally {
    db.releaseClient(client)
  }
}

// ------------------------------------------------------------
// Delete reservation
// ------------------------------------------------------------
async function deleteBatchReservation (context, entityId, plantId, batchId, client) {
  await inventoryReservationRepository.removeByBatch(context, entityId, plantId, batchId, client)
}
// ------------------------------------------------------------
// Consume reservation
// ------------------------------------------------------------
async function consumeReservation (context, entityId, plantId, reservationId, client) {
  const consumedBy = context.session.userId

  const reservation = await db.row(
            `SELECT r.*, ii.product_id, ii.location_id
           FROM interview.inventory_reservation r
           JOIN interview.inventory_item ii ON ii.id=r.inventory_item_id
           WHERE r.id=$1
           -- Entity and plant filter
            AND r.entity_id = $2 AND r.plant_id = $3
            AND ii.entity_id = $2 AND ii.plant_id = $3
           FOR UPDATE`,
            [reservationId, entityId, plantId], client
  )

  console.log('consumeReservation reservation: ', reservation)
  // const reservation = res.rows[0]
  if (!reservation) throw new Error('Reservation not found')
  if (reservation.status !== 'RESERVED') { throw new Error('Reservation not RESERVED') }

  const ii = await _getInventoryItem(entityId, plantId, reservation.inventoryItemId, client)
  if (!ii) throw new Error('Item missing')

  if (parseFloat(ii.quantity) < parseFloat(reservation.quantity)) { throw new Error('Insufficient stock to consume') }

  const newQty = parseFloat(ii.quantity) - parseFloat(reservation.quantity)

  await db.query(
            `UPDATE interview.inventory_item
           SET quantity=$1, updated_at=$2, updated_by=$3
           WHERE id=$4 AND entity_id = $5 AND plant_id = $6`,
            [newQty, timestamp(), consumedBy, ii.id, entityId, plantId], client
  )

  // Movement ISSUE
  await db.query(
            `INSERT INTO interview.inventory_movement
           (id, inventory_item_id, movement_type, quantity,
            source_location_id, reason, created_at, created_by, entity_id, plant_id)
           VALUES (gen_random_uuid(),$1,'ISSUE',$2,$3,$4,$5,$6,$7,$8)`,
            [
              ii.id,
              reservation.quantity,
              ii.locationId,
                `Consumed for batch ${reservation.batchId}`,
                timestamp(),
                consumedBy,
                entityId,
                plantId
            ], client
  )

  // Insert material_consumption
  await db.query(
            `INSERT INTO interview.material_consumption
           (id, batch_id, material_id, quantity, unit_id,
            inventory_item_id, notes, created_at, entity_id, plant_id)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              reservation.batchId,
              reservation.materialId || ii.productId,
              reservation.quantity,
              reservation.unitId,
              ii.id,
              `Consumed from reservation ${reservationId}`,
              timestamp(),
              entityId,
              plantId
            ], client
  )

  // await db.query(
  //           `UPDATE interview.inventory_reservation
  //          SET status='CONSUMED', released_at=$1, released_by=$2
  //          WHERE id=$3
  //          -- Entity and plant filter
  //           AND entity_id = $4 AND plant_id = $5`,
  //           [timestamp(), consumedBy, reservationId, entityId, plantId], client
  // )

  await inventoryReservationRepository.consume(context, entityId, plantId, reservationId, client)

  return {
    reservationId,
    consumedQuantity: reservation.quantity,
    inventory_item_id: ii.id
  }
}

// ------------------------------------------------------------
// Direct consume
// ------------------------------------------------------------
async function directConsume ({ entityId, plantId, inventoryItemId, batchId, materialId, quantity, unitId, createdBy, notes }) {
  const client = db.acquireClient()
  try {
    await db.begin(client)

    const ii = await _getInventoryItem(entityId, plantId, inventoryItemId, client)
    if (!ii) throw new Error('Inventory item not found')

    const reserved = await _getReservedQuantity(entityId, plantId, inventoryItemId, client)
    const available = parseFloat(ii.quantity) - reserved
    if (available < quantity) throw new Error('Insufficient available')

    const newQty = parseFloat(ii.quantity) - parseFloat(quantity)

    await db.query(
            `UPDATE interview.inventory_item
           SET quantity=$1, updated_at=$2, updated_by=$3
           WHERE id=$4
           -- Entity and plant filter
            AND entity_id = $5 AND plant_id = $6`,
            [newQty, timestamp(), createdBy, inventoryItemId, entityId, plantId], client
    )

    await db.query(
            `INSERT INTO interview.inventory_movement
           (id, inventory_item_id, movement_type, quantity,
            source_location_id, reason, created_at, created_by, entity_id, plant_id)
           VALUES (gen_random_uuid(),$1,'ISSUE',$2,$3,$4,$5,$6,$7,$8)`,
            [
              inventoryItemId,
              quantity,
              ii.location_id,
              notes || `Direct consume for batch ${batchId}`,
              timestamp(),
              createdBy,
              entityId,
              plantId
            ], client
    )

    await db.query(
            `INSERT INTO interview.material_consumption
           (id, batch_id, material_id, quantity, unit_id, inventory_item_id, notes, created_at, entity_id, plant_id)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              batchId,
              materialId || ii.product_id,
              quantity,
              unitId,
              inventoryItemId,
              notes,
              timestamp(),
              entityId,
              plantId
            ], client
    )

    await db.commit(client)
    return { inventory_item_id: inventoryItemId, consumedQuantity: quantity }
  } catch (err) {
    await db.rollback(client)
    throw err
  } finally {
    db.releaseClient(client)
  }
}

// ------------------------------------------------------------
// Adjustments
// ------------------------------------------------------------
async function adjustInventory (context, entityId, plantId, inventoryItemId, deltaQuantity, reason) {
  console.log('inventoryItemId: ', inventoryItemId)
  const client = await db.acquireClient()
  try {
    await db.begin(client)

    const userId = context.session.userId

    const ii = await _getInventoryItem(entityId, plantId, inventoryItemId, client)
    if (!ii) throw new Error('Inventory item not found')

    const newQty = parseFloat(ii.quantity) + parseFloat(deltaQuantity)
    if (newQty < 0) throw new Error('Cannot adjust below zero')

    await db.query(
            `UPDATE interview.inventory_item
           SET quantity=$1, updated_at=$2, updated_by=$3 WHERE id=$4
           -- Entity and plant filter
            AND entity_id = $5 AND plant_id = $6`,
            [newQty, timestamp(), userId, inventoryItemId, entityId, plantId], client
    )

    await db.query(
            `INSERT INTO interview.inventory_movement
           (id, inventory_item_id, movement_type, quantity,
            source_location_id, destination_location_id,
            reason, created_at, created_by, entity_id, plant_id)
           VALUES (gen_random_uuid(),$1,'ADJUSTMENT',$2,$3,$3,$4,$5,$6,$7,$8)`,
            [
              inventoryItemId,
              deltaQuantity,
              ii.location_id,
              reason,
              timestamp(),
              userId,
              entityId,
              plantId
            ], client
    )

    await db.commit(client)
    return { inventory_item_id: inventoryItemId, newQuantity: newQty }
  } catch (err) {
    await db.rollback(client)
    throw err
  } finally {
    await db.releaseClient(client)
  }
}

// ------------------------------------------------------------
// FEFO selection
// ------------------------------------------------------------
async function selectLotsFEFO ({ context, entityId, plantId, productId, vendorId, requiredQuantity }) {
  const client = await db.acquireClient()
  try {
    const selectedLots = await _selectFefoLots(entityId, plantId, productId, vendorId, client)
    console.log('selectedLots _selectFefoLots: ', selectedLots)

    let remaining = parseFloat(requiredQuantity)
    const picks = []

    for (const lot of selectedLots) {
      const availableQty = parseFloat(lot.availableQty || 0)
      if (availableQty <= 0) continue

      const reservedQty = parseFloat(lot.reservedQty || 0)
      const totalQty = parseFloat(lot.totalQty || 0)

      const pick = Math.min(availableQty, remaining)

      const lotData = await lotRepository.findById(context, entityId, plantId, lot.lotId, client)
      console.log('lotData: ', lotData)

      const { lotCode, expirationAt } = lotData || {}

      picks.push({
        productId,
        vendorId,
        inventoryItemId: lot.inventoryItemId,
        lotId: lot.lotId,
        lotCode,
        expirationAt,
        locationId: lot.locationId,
        availableQty,
        reservedQty,
        totalQty,
        pickQty: pick
      })

      remaining -= pick
      if (remaining <= 0) break
    }

    return remaining > 0 ? { picks, shortage: remaining } : { picks, shortage: 0 }
  } finally {
    await db.releaseClient(client)
  }
}

// ------------------------------------------------------------
// Lots for a product selection
// ------------------------------------------------------------
async function selectProductLots ({ context, entityId, plantId, productId, vendorId, requiredQuantity }) {
  const client = await db.acquireClient()
  try {
    const selectedLots = await _selectFefoLots(entityId, plantId, productId, vendorId, client)
    console.log('selectedLots _selectFefoLots: ', selectedLots)

    let remaining = parseFloat(requiredQuantity)
    const picks = []

    for (const lot of selectedLots) {
      const availableQty = parseFloat(lot.availableQty || 0)
      if (availableQty <= 0) continue

      const reservedQty = parseFloat(lot.reservedQty || 0)
      const totalQty = parseFloat(lot.totalQty || 0)

      const pick = Math.min(availableQty, remaining)

      const lotData = await lotRepository.findById(context, entityId, plantId, lot.lotId, client)
      console.log('lotData: ', lotData)

      const { lotCode, expirationAt } = lotData || {}

      picks.push({
        productId,
        vendorId,
        inventoryItemId: lot.inventoryItemId,
        lotId: lot.lotId,
        lotCode,
        expirationAt,
        locationId: lot.locationId,
        availableQty,
        reservedQty,
        totalQty,
        pickQty: pick
      })

      remaining -= pick
      if (remaining <= 0) break
    }

    return remaining > 0 ? { picks, shortage: remaining } : { picks, shortage: 0 }
  } finally {
    await db.releaseClient(client)
  }
}

// ------------------------------------------------------------
// Inventory list
// ------------------------------------------------------------
async function getInventoryByProduct (entityId, plantId, productId) {
  const client = db.acquireClient()
  try {
    const { rows } = await db.query(
            `SELECT ii.*, l.code AS lot_code, l.expiration_at,
                  COALESCE(
                    (SELECT SUM(quantity)
                     FROM interview.inventory_reservation ir
                     WHERE ir.inventory_item_id = ii.id
                       AND ir.status='RESERVED'
                    ),0
                  )::numeric AS reserved_quantity
           FROM interview.inventory_item ii
           LEFT JOIN interview.lot l ON ii.lot_id=l.id
           WHERE ii.product_id=$1
           -- Entity and plant filter
            AND ii.entity_id = $2 AND ii.plant_id = $3
            AND l.entity_id = $2 AND l.plant_id = $3
           ORDER BY l.expiration_at NULLS LAST, ii.created_at`,
            [productId, entityId, plantId], client
    )

    return rows
  } finally {
    db.releaseClient(client)
  }
}

async function getReservationsForBatch (entityId, plantId, batchId) {
  const query = `
    SELECT 
        r.id AS reservation_id,
        r.batch_id,
        r.inventory_item_id,
        r.reserved_quantity,
        r.uom,
        r.status,
        r.created_at,

        ii.product_id,
        ii.lot_id,
        ii.quantity AS inventory_quantity,
        ii.location_id,

        p.name AS product_name,
        l.lot_code,
        loc.name AS location_name

    FROM interview.inventory_reservation r
    JOIN interview.inventory_items ii ON ii.id = r.inventory_item_id
    LEFT JOIN interview.products p ON p.id = ii.product_id
    LEFT JOIN interview.lots l ON l.id = ii.lot_id
    LEFT JOIN interview.locations loc ON loc.id = ii.location_id

    WHERE r.batch_id = $1
    AND r.status IN ('RESERVED', 'PARTIAL') -- Not completed or released

    -- Entity and plant filter
    AND r.entity_id = $2 AND r.plant_id = $3
    AND ii.entity_id = $2 AND ii.plant_id = $3
    AND p.entity_id = $2 AND p.plant_id = $3
    AND l.entity_id = $2 AND l.plant_id = $3
    AND loc.entity_id = $2 AND loc.plant_id = $3

    ORDER BY r.created_at ASC;
  `

  const result = await db.query(query, [batchId, entityId, plantId])
  return result
}

async function getBatchReservationDetails (entityId, plantId, batchId) {
  const reservations = await getReservationsForBatch(entityId, plantId, batchId)

  return {
    batchId,
    totalReserved: reservations.reduce(
      (sum, r) => sum + Number(r.reserved_quantity || 0),
      0
    ),
    items: reservations
  }
}

export const inventoryService = {
  lockInventoryItems,
  receiveToInventory,
  transferInventory,
  reserveInventory,
  deleteBatchReservation,
  releaseReservation,
  consumeReservation,
  directConsume,
  adjustInventory,
  selectLotsFEFO,
  selectProductLots,
  getInventoryByProduct,
  getAvailableQuantity,
  getReservationsForBatch,
  getBatchReservationDetails
}
