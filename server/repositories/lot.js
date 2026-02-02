import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.lot')

const findById = async (context, entityId, plantId, lotId, client = null) => {
  const query = `
    SELECT 
      lot.id,
      lot.batch_id,
      bat.code as batch_code,
      lot.product_id,
      prd.code as product_code,
      prd.name as product_name,
      lot.code as lot_code,
      lot.quantity,
      lot.manufactured_at,
      lot.expiration_at,
      lot.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      lot.is_own_product,
      lot.created_at,
      us1.full_name as "created_by",
      lot.updated_at,
      us2.full_name as "updated_by"
    FROM interview.lot lot
    INNER JOIN interview.product prd ON (lot.product_id = prd.id)
    LEFT JOIN interview.batch bat ON (lot.batch_id = bat.id)
    LEFT JOIN interview.vendor ven ON (lot.vendor_id = ven.id)
    INNER JOIN auth.user us1 ON (lot.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (lot.updated_by = us2.id)
    WHERE lot.id = $1
    -- Entity and Plant filtering
      AND lot.entity_id = $2
      AND lot.plant_id = $3
      AND us1.entity_id = $2
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)`

  const bind = [lotId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByProduct = async (context, entityId, plantId, productId, client = null) => {
  const query = `
    SELECT 
      lot.id,
      lot.batch_id,
      bat.code as batch_code,
      lot.product_id,
      prd.code as product_code,
      prd.name as product_name,
      lot.code,
      lot.quantity,
      lot.manufactured_at,
      lot.expiration_at,
      lot.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      lot.is_own_product,
      lot.created_at,
      us1.full_name as "created_by",
      lot.updated_at,
      us2.full_name as "updated_by"
    FROM interview.lot lot
    INNER JOIN interview.product prd ON (lot.product_id = prd.id)
    LEFT JOIN interview.batch bat ON (lot.batch_id = bat.id)
    LEFT JOIN interview.vendor ven ON (lot.vendor_id = ven.id)
    INNER JOIN auth.user us1 ON (lot.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (lot.updated_by = us2.id)
    WHERE lot.product_id = $1
    -- Entity and Plant filtering
      AND lot.entity_id = $2
      AND lot.plant_id = $3
      AND us1.entity_id = $2
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
    ORDER BY lot.expiration_at ASC`

  const bind = [productId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const findByBatch = async (context, entityId, plantId, batchId, client = null) => {
  const query = `
    SELECT 
      lot.id,
      lot.batch_id,
      bat.code as batch_code,
      lot.product_id,
      prd.code as product_code,
      prd.name as product_name,
      lot.code,
      lot.quantity,
      lot.manufactured_at,
      lot.expiration_at,
      lot.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      lot.is_own_product,
      lot.created_at,
      us1.full_name as "created_by",
      lot.updated_at,
      us2.full_name as "updated_by"
    FROM interview.lot lot
    INNER JOIN interview.product prd ON (lot.product_id = prd.id)
    LEFT JOIN interview.batch bat ON (lot.batch_id = bat.id)
    LEFT JOIN interview.vendor ven ON (lot.vendor_id = ven.id)
    INNER JOIN auth.user us1 ON (lot.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (lot.updated_by = us2.id)
    WHERE lot.batch_id = $1
    -- Entity and Plant filtering
      AND lot.entity_id = $2
      AND lot.plant_id = $3
      AND us1.entity_id = $2
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
    ORDER BY lot.manufactured_at DESC`

  const bind = [batchId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      lot.id,
      lot.batch_id,
      bat.code as batch_code,
      lot.product_id,
      prd.code as product_code,
      prd.name as product_name,
      lot.code,
      lot.quantity,
      lot.manufactured_at,
      lot.expiration_at,
      lot.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      lot.is_own_product,
      lot.created_at,
      us1.full_name as "created_by",
      lot.updated_at,
      us2.full_name as "updated_by"
    FROM interview.lot lot
    INNER JOIN interview.product prd ON (lot.product_id = prd.id)
    LEFT JOIN interview.batch bat ON (lot.batch_id = bat.id)
    LEFT JOIN interview.vendor ven ON (lot.vendor_id = ven.id)
    INNER JOIN auth.user us1 ON (lot.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (lot.updated_by = us2.id)
    WHERE 1=1
      AND (
        lot.code ILIKE concat('%', concat($1::varchar, '%')) OR
        prd.code ILIKE concat('%', concat($2::varchar, '%')) OR
        prd.name ILIKE concat('%', concat($3::varchar, '%'))
      )
    -- Entity and Plant filtering
      AND lot.entity_id = $4
      AND lot.plant_id = $5
      AND us1.entity_id = $4
      AND (us2.entity_id = $4 OR us2.entity_id IS NULL)
    ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, id, batchId, productId, code, quantity, manufacturedAt, expirationAt, vendorId, isOwnProduct, client = null) => {
  const query = `
    INSERT INTO interview.lot
    (id, batch_id, product_id, code, quantity, manufactured_at, expiration_at, vendor_id, is_own_product, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `
  const bind = [
    id,
    batchId || null,
    productId,
    code,
    quantity || null,
    manufacturedAt || null,
    expirationAt,
    vendorId || null,
    isOwnProduct,
    context.session.userId,
    timestamp(),
    entityId,
    plantId
  ]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, lotId, batchId, productId, code, quantity, manufacturedAt, expirationAt, vendorId, isOwnProduct, client = null) => {
  const query = `
    UPDATE interview.lot
    SET
      batch_id = $1,
      product_id = $2,
      code = $3,
      quantity = $4,
      manufactured_at = $5,
      expiration_at = $6,
      vendor_id = $7,
      is_own_product = $8,
      updated_by = $9,
      updated_at = $10
    WHERE id = $11
    -- Entity and Plant filtering
      AND entity_id = $12
      AND plant_id = $13
    RETURNING id
  `
  const bind = [
    batchId || null,
    productId,
    code,
    quantity || null,
    manufacturedAt || null,
    expirationAt,
    vendorId || null,
    isOwnProduct,
    context.session.userId,
    timestamp(),
    lotId,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const remove = async (context, entityId, plantId, lotId, client = null) => {
  const query = `
    DELETE FROM interview.lot
    WHERE id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [lotId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      lot.id,
      lot.code,
      lot.product_id,
      prd.code as product_code,
      prd.name as product_name,
      lot.quantity,
      lot.expiration_at,
      lot.is_own_product
    FROM interview.lot lot
    INNER JOIN interview.product prd ON (lot.product_id = prd.id)
    -- Entity and Plant filtering
    WHERE lot.entity_id = $1
      AND lot.plant_id = $2
    ORDER BY lot.expiration_at ASC
  `

  const response = await db.query(query, [entityId, plantId], client)

  return response
}

const findAvailableLots = async (context, entityId, plantId, productId, client = null) => {
  const query = `
    SELECT 
      lot.id,
      lot.code,
      lot.product_id,
      prd.code as product_code,
      prd.name as product_name,
      lot.quantity,
      lot.manufactured_at,
      lot.expiration_at,
      lot.vendor_id,
      ven.name as vendor_name,
      lot.is_own_product
    FROM interview.lot lot
    INNER JOIN interview.product prd ON (lot.product_id = prd.id)
    LEFT JOIN interview.vendor ven ON (lot.vendor_id = ven.id)
    WHERE lot.product_id = $1
      AND lot.quantity > 0
      AND lot.expiration_at > $2
    -- Entity and Plant filtering
      AND lot.entity_id = $3
      AND lot.plant_id = $4
    ORDER BY lot.expiration_at ASC
  `

  const bind = [productId, timestamp(), entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

export const lotRepository = {
  ...baseRepository,
  findById,
  findByProduct,
  findByBatch,
  tablePaginated,
  create,
  update,
  remove,
  listAll,
  findAvailableLots
}
