import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.inventory_item')

const findById = async (context, entityId, plantId, itemId, client = null) => {
  const query = `
           SELECT 
            itm.id,
            itm.product_id,
            prd.code as product_code,
            prd."name" as product_name,
            itm.lot_id,
            lot.code as lot_code,
            itm.vendor_id,
            ven.code as vendor_code,
            ven."name" as vendor_name,
            itm.price,
            itm.currency,
            itm.quantity,
            itm.expiration_at,
            itm.location_id,
            loc.code as location_code,
            loc."name" as location_name,
            itm.type,
            itm.created_at,
            us1.full_name as "created_by",
            itm.updated_at,
            us2.full_name as "updated_by"
           FROM interview.inventory_item itm
           INNER JOIN interview.product prd ON (itm.product_id = prd.id)
           LEFT JOIN interview.lot lot ON (itm.lot_id = lot.id)
           LEFT JOIN interview.vendor ven ON (itm.vendor_id = ven.id)
           INNER JOIN interview.inventory_location loc ON (itm.location_id = loc.id)
           INNER JOIN auth.user us1 ON (itm.created_by = us1.id)
           LEFT JOIN auth.user us2 ON (itm.updated_by = us2.id)
           WHERE itm.id = $1
           -- Entity and Plant filtering
           AND prd.entity_id = $2
           AND prd.plant_id = $3
           AND itm.entity_id = $2
           AND itm.plant_id = $3
           AND lot.entity_id = $2
           AND lot.plant_id = $3
           AND ven.entity_id = $2
           AND ven.plant_id = $3
           AND loc.entity_id = $2
           AND loc.plant_id = $3
           AND us1.entity_id = $2
           AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
           `

  const bind = [itemId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByNameOrCode = async (context, entityId, plantId, search = null, client = null) => {
  const query = `
           SELECT 
            itm.id,
            itm.product_id,
            prd.code as product_code,
            prd."name" as product_name,
            itm.lot_id,
            lot.code as lot_code,
            itm.vendor_id,
            ven.code as vendor_code,
            ven."name" as vendor_name,
            itm.price,
            itm.currency,
            itm.quantity,
            itm.expiration_at,
            itm.location_id,
            loc.code as location_code,
            loc."name" as location_name,
            itm.type
           FROM interview.inventory_item itm
           INNER JOIN interview.product prd ON (itm.product_id = prd.id)
           LEFT JOIN interview.lot lot ON (itm.lot_id = lot.id)
           LEFT JOIN interview.vendor ven ON (itm.vendor_id = ven.id)
           INNER JOIN interview.inventory_location loc ON (itm.location_id = loc.id)
           WHERE 1=1
           ${search ? 'AND (prd."name" ILIKE concat(\'%\', concat($1::varchar, \'%\')) OR prd.code ILIKE concat(\'%\', concat($1::varchar, \'%\')))' : ''}
           -- Entity and Plant filtering
            AND prd.entity_id = $2
            AND prd.plant_id = $3
            AND itm.entity_id = $2
            AND itm.plant_id = $3
            AND lot.entity_id = $2
            AND lot.plant_id = $3
            AND ven.entity_id = $2
            AND ven.plant_id = $3
            AND loc.entity_id = $2
            AND loc.plant_id = $3
           ORDER BY prd."name"
           LIMIT 5`

  const bind = search ? [search, entityId, plantId] : [entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const findByProduct = async (context, entityId, plantId, productId, vendorId, client = null) => {
  const response = await db.query(
        `SELECT
              iit.id as inventory_item_id,
              iit.lot_id,
              iit.location_id,
              prd.id as product_id,
              prd.code as product_code,
              prd."name" as product_name,
              COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0) AS reserved_qty,
              (iit.quantity - COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0))::numeric AS available_qty,
              iit.quantity AS total_qty,
              lot.expiration_at,
              lot.code as lot_code,
              prd.unit_of_measure_id,
              uom.code as unit_of_measure_code,
              uom.name as unit_of_measure_name
       FROM interview.inventory_item iit
       INNER JOIN interview.product prd ON iit.product_id = prd.id
       LEFT JOIN interview.unit_of_measure uom ON prd.unit_of_measure_id = uom.id
       LEFT JOIN interview.inventory_reservation ire
              ON ire.inventory_item_id = iit.id AND ire.status='RESERVED'
       LEFT JOIN interview.lot lot ON lot.id = iit.lot_id
       WHERE iit.product_id = $1
       AND iit.vendor_id = $2
       -- Entity and plant filter
        AND iit.entity_id = $3
        AND iit.plant_id = $4
        AND prd.entity_id = $3
        AND (prd.plant_id = $4 OR prd.plant_id IS NULL)
        AND (ire.entity_id = $3 OR ire.entity_id IS NULL)
        AND (ire.plant_id = $4 OR ire.plant_id IS NULL)
        AND (lot.entity_id = $3 OR lot.entity_id IS NULL)
        AND (lot.plant_id = $4 OR lot.plant_id IS NULL)
       GROUP BY iit.id, lot.expiration_at, lot.code, prd.unit_of_measure_id, uom.code, uom.name, prd.id, prd.code, prd."name"
       -- HAVING (iit.quantity - COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0)) > 0
       ORDER BY lot.expiration_at NULLS LAST, iit.created_at ASC`,
        [productId, vendorId, entityId, plantId],
        client
  )

  console.log('findByProduct response: ', response)
  return response
}

// const findByProduct = async (context, entityId, plantId, productId, vendorId, client = null) => {
//   const response = await db.query(
//         `SELECT
//               iit.id as inventory_item_id,
//               iit.lot_id,
//               iit.location_id,
//               COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0) AS reserved_qty,
//               (iit.quantity - COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0))::numeric AS available_qty,
//               iit.quantity AS total_qty,
//               lot.expiration_at
//        FROM interview.inventory_item iit
//        LEFT JOIN interview.inventory_reservation ire
//               ON ire.inventory_item_id = iit.id AND ire.status='RESERVED'
//        LEFT JOIN interview.lot lot ON lot.id = iit.lot_id
//        WHERE iit.product_id = $1
//        AND iit.vendor_id = $2
//        -- Entity and plant filter
//         AND iit.entity_id = $3
//         AND iit.plant_id = $4
//         AND (ire.entity_id = $3 OR ire.entity_id IS NULL)
//         AND (ire.plant_id = $4 OR ire.plant_id IS NULL)
//         AND (lot.entity_id = $3 OR lot.entity_id IS NULL)
//         AND (lot.plant_id = $4 OR lot.plant_id IS NULL)
//        GROUP BY iit.id, lot.expiration_at
//        HAVING (iit.quantity - COALESCE(SUM(ire.quantity) FILTER (WHERE ire.status='RESERVED'),0)) > 0
//        ORDER BY lot.expiration_at NULLS LAST, iit.created_at ASC`,
//         [productId, vendorId, entityId, plantId],
//         // [productId, vendorId],
//         client
//   )

//   return response
// }

const tablePaginated = async (context, entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, isOwn, client = null) => {
  console.log(' isOwn: ', isOwn)
  let query = `
            SELECT 
            itm.id,
            itm.product_id,
            prd.code as product_code,
            prd."name" as product_name,
            puom.code as unit_of_measure_code,
            itm.lot_id,
            lot.code as lot_code,
            prd.is_own,
            itm.vendor_id,
            ven.code as vendor_code,
            ven."name" as vendor_name,
            itm.price,
            itm.currency,
            itm.quantity,
            COALESCE(res.reserved_quantity, 0) as reserved_quantity,
            itm.expiration_at,
            itm.location_id,
            loc.code as location_code,
            loc."name" as location_name,
            itm.type,
            itm.created_at,
            us1.full_name as "created_by",
            itm.updated_at,
            us2.full_name as "updated_by"
           FROM interview.inventory_item itm
           INNER JOIN interview.product prd ON (itm.product_id = prd.id)
           LEFT JOIN interview.lot lot ON (itm.lot_id = lot.id)
           LEFT JOIN interview.vendor ven ON (itm.vendor_id = ven.id)
           INNER JOIN interview.inventory_location loc ON (itm.location_id = loc.id)
           INNER JOIN auth.user us1 ON (itm.created_by = us1.id)
           LEFT JOIN auth.user us2 ON (itm.updated_by = us2.id)
           INNER JOIN interview.unit_of_measure puom ON (prd.unit_of_measure_id = puom.id)
           LEFT JOIN (
               SELECT inventory_item_id, SUM(quantity) as reserved_quantity
               FROM interview.inventory_reservation
               WHERE status = 'RESERVED'
               GROUP BY inventory_item_id
           ) res ON (itm.id = res.inventory_item_id)
           WHERE 1=1
            AND (
                prd."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                prd.code ILIKE concat('%', concat($1::varchar, '%')) OR
                loc."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                loc.code ILIKE concat('%', concat($1::varchar, '%')) OR
                lot.code ILIKE concat('%', concat($1::varchar, '%')) OR
                ven."name" ILIKE concat('%', concat($1::varchar, '%'))
            )
            -- Entity and Plant filtering
            AND prd.entity_id = $2
            AND (prd.plant_id = $3 OR prd.plant_id is NULL)
            AND (itm.entity_id = $2 OR itm.entity_id is NULL)
            AND (itm.plant_id = $3 OR itm.plant_id is NULL)
            AND (lot.entity_id = $2 or lot.entity_id IS NULL)
            AND (lot.plant_id = $3 OR lot.plant_id is NULL)
            AND (ven.entity_id = $2 OR ven.entity_id is NULL)
            AND (ven.plant_id = $3 OR ven.plant_id is NULL)
            AND (loc.entity_id = $2 OR loc.entity_id is NULL)
            AND (loc.plant_id = $3 OR loc.plant_id is NULL)
            AND (us1.entity_id = $2 OR us1.entity_id is NULL)
            AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
            `

  const bind = [search, entityId, plantId]

  if (isOwn === true) {
    query += ' AND prd.is_own = $7'
    bind.push(isOwn)
  }

  query += ` ORDER BY ${orderCol} ${orderDir}`

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, itemId, productId, lotId, vendorId, price, currency, quantity, expirationAt, locationId, type, client = null) => {
  const query = `
            INSERT INTO interview.inventory_item
            (id, product_id, lot_id, vendor_id, price, currency, quantity, expiration_at, location_id, type, created_by, created_at, entity_id, plant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `
  const bind = [
    itemId,
    productId,
    lotId || null,
    vendorId || null,
    price || null,
    currency || 'USD',
    quantity,
    expirationAt || null,
    locationId,
    type,
    context.session.userId,
    timestamp(),
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, itemId, productId, lotId, vendorId, price, currency, quantity, expirationAt, locationId, type, client = null) => {
  const query = `
            UPDATE interview.inventory_item
            SET
              product_id = $1,
              lot_id = $2,
              vendor_id = $3,
              price = $4,
              currency = $5,
              quantity = $6,
              expiration_at = $7,
              location_id = $8,
              type = $9,
              updated_by = $10,
              updated_at = $11
            WHERE id = $12
              AND entity_id = $13
              AND plant_id = $14
            RETURNING id
        `
  const bind = [
    productId,
    lotId || null,
    vendorId || null,
    price || null,
    currency || 'USD',
    quantity,
    expirationAt || null,
    locationId,
    type,
    context.session.userId,
    timestamp(),
    itemId,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

// const deleteById = async (itemId, client = null) => {
//   const query = `
//             DELETE FROM interview.inventory_item
//             WHERE id = $1
//             RETURNING id
//         `
//   const bind = [itemId]

//   const response = await db.query(query, bind, client)

//   return response
// }

const listAll = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      itm.id,
      itm.product_id,
      prd.code as product_code,
      prd."name" as product_name,
      itm.quantity,
      itm.location_id,
      loc.code as location_code,
      loc."name" as location_name,
      itm.type
    FROM interview.inventory_item itm
    INNER JOIN interview.product prd ON (itm.product_id = prd.id)
    INNER JOIN interview.inventory_location loc ON (itm.location_id = loc.id)
    -- Entity and Plant filtering
    WHERE prd.entity_id = $1
      AND prd.plant_id = $2
    ORDER BY prd."name" ASC
  `

  const response = await db.query(query, [entityId, plantId], client)

  return response
}

export const inventoryItemRepository = {
  ...baseRepository,
  findById,
  findByNameOrCode,
  findByProduct,
  tablePaginated,
  create,
  update,
  // deleteById,
  listAll
}
