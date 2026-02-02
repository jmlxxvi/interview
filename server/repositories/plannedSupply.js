import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.planned_supply')

const findById = async (context, entityId, plantId, plannedSupplyId, client = null) => {
  const query = `
    SELECT 
      pls.id,
      pls.product_id,
      prd.code as product_code,
      prd.name as product_name,
      prd.unit_of_measure_id as product_unit_id,
      puom.code as product_unit_code,
      puom.name as product_unit_name,
      pls.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      pls.quantity,
      pls.unit_id,
      uom.code as unit_code,
      uom.name as unit_name,
      pls.source_type,
      pls.source_code,
      pls.expected_at,
      pls.created_at,
      us1.full_name as created_by,
      pls.updated_at,
      us2.full_name as updated_by
    FROM interview.planned_supply pls
    INNER JOIN interview.product prd ON (pls.product_id = prd.id)
    LEFT JOIN interview.unit_of_measure puom ON (prd.unit_of_measure_id = puom.id)
    INNER JOIN interview.vendor ven ON (pls.vendor_id = ven.id)
    LEFT JOIN interview.unit_of_measure uom ON (pls.unit_id = uom.id)
    INNER JOIN auth.user us1 ON (pls.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (pls.updated_by = us2.id)
    WHERE pls.id = $1
      AND pls.entity_id = $2
      AND pls.plant_id = $3
  `
  const bind = [plannedSupplyId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

export async function findByProduct (context, entityId, plantId, productId, vendorId, client = null) {
  console.log('findByProductentityId, plantId, productId, vendorId: ', entityId, plantId, productId, vendorId)
  const query = `SELECT 
      ps.id as planned_supply_id,
      ps.product_id,
      prd.code as product_code,
      prd.name as product_name,
      ps.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      COALESCE(pr.reserved_quantity, 0) as reserved_quantity,
      ps.quantity,
      ps.quantity - COALESCE(pr.reserved_quantity, 0) as available_quantity,
      uom.id as unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      ps.source_type,
      ps.source_code,
      ps.expected_at
     FROM interview.planned_supply ps
     INNER JOIN interview.product prd ON (ps.product_id = prd.id)
     INNER JOIN interview.vendor ven ON (ps.vendor_id = ven.id)
     LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
     LEFT JOIN (
          SELECT pri.planned_supply_id, SUM(pri.quantity) as reserved_quantity
          FROM interview.planned_reservation pri
          WHERE pri.status = 'RESERVED'
          AND (pri.entity_id = $3 OR pri.entity_id IS NULL)
          AND (pri.plant_id = $4 OR pri.plant_id IS NULL)
          GROUP BY pri.planned_supply_id
     ) pr ON (pr.planned_supply_id = ps.id)
     WHERE ps.product_id = $1
       AND ps.vendor_id = $2
       AND ps.entity_id = $3
       AND ps.plant_id = $4
       AND ven.entity_id = $3
       AND ven.plant_id = $4
     ORDER BY ps.expected_at ASC`

  const bind = [productId, vendorId, entityId, plantId]
  // const bind = [productId, vendorId]

  const response = await db.query(query, bind, client)
  return response
}

const tablePaginated = async (entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      pls.id,
      pls.product_id,
      prd.code as product_code,
      prd.name as product_name,
      prd.unit_of_measure_id as product_unit_id,
      puom.code as product_unit_code,
      puom.name as product_unit_name,
      pls.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      pls.quantity,
      puom.id as unit_of_measure_id,
      uom.code as unit_code,
      uom.name as unit_name,
      pls.source_type,
      pls.source_code,
      pls.expected_at,
      pls.created_at,
      us1.full_name as created_by,
      pls.updated_at,
      us2.full_name as updated_by
    FROM interview.planned_supply pls
    INNER JOIN interview.product prd ON (pls.product_id = prd.id)
    LEFT JOIN interview.unit_of_measure puom ON (prd.unit_of_measure_id = puom.id)
    INNER JOIN interview.vendor ven ON (pls.vendor_id = ven.id)
    LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
    INNER JOIN auth.user us1 ON (pls.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (pls.updated_by = us2.id)
    WHERE 1=1
      AND pls.entity_id = $4
      AND pls.plant_id = $5
      AND (
        prd.code ILIKE concat('%', concat($1::varchar, '%')) OR
        prd.name ILIKE concat('%', concat($2::varchar, '%')) OR
        ven.name ILIKE concat('%', concat($3::varchar, '%'))
      )
    ORDER BY ${orderCol} ${orderDir}
  `

  const bind = [search, search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, id, productId, vendorId, quantity, sourceType, sourceCode, expectedAt, client = null) => {
  console.log('entityId, plantId, id, productId, vendorId, quantity, sourceType, sourceCode, expectedAt: ', entityId, plantId, id, productId, vendorId, quantity, sourceType, sourceCode, expectedAt)
  const query = `
    INSERT INTO interview.planned_supply
    (id, product_id, vendor_id, quantity, source_type, source_code, expected_at, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `
  const bind = [
    id,
    productId,
    vendorId,
    quantity,
    sourceType,
    sourceCode || null,
    expectedAt,
    context.session.userId,
    timestamp(),
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, id, productId, vendorId, quantity, sourceType, sourceCode, expectedAt, client = null) => {
  const query = `
    UPDATE interview.planned_supply
    SET
      product_id = $1,
      vendor_id = $2,
      quantity = $3,
      source_type = $4,
      source_code = $5,
      expected_at = $6,
      updated_by = $7,
      updated_at = $8
    WHERE id = $9
      AND entity_id = $10
      AND plant_id = $11
    RETURNING id
  `
  const bind = [
    productId,
    vendorId,
    quantity,
    sourceType,
    sourceCode || null,
    expectedAt,
    context.session.userId,
    timestamp(),
    id,
    entityId,
    plantId
  ]

  const response = await db.query(query, bind, client)

  return response
}

export async function getPlannedSupplyByProduct (context, entityId, plantId, productId, untilEpoch = Number.MAX_SAFE_INTEGER, client = null) {
  const response = await db.query(
    `SELECT * FROM interview.planned_supply
     WHERE product_id = $1 AND expected_at <= $2 AND quantity > 0
        AND entity_id = $3 AND plant_id = $4
     ORDER BY expected_at ASC`,
    [productId, untilEpoch, entityId, plantId],
    client
  )
  return response
}

export async function reducePlannedSupply (context, entityId, plantId, id, reduceQty, client = null) {
  const response = await db.value(
      `UPDATE interview.planned_supply
       SET quantity = quantity - $1, updated_at = $2
       WHERE id = $3
         AND entity_id = $4
         AND plant_id = $5
       RETURNING *`,
      [reduceQty, timestamp(), id, entityId, plantId],
      client
  )
  return response
}

export async function createPlannedSupply (context, entityId, plantId, productId, quantity, unitId, sourceType, sourceCode, expectedAt, createdBy, client = null) {
  const response = await db.query(
      `INSERT INTO interview.planned_supply
       (id, product_id, quantity, unit_id, source_type, source_code, expected_at, created_at, created_by, entity_id, plant_id, vendor_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [productId, quantity, unitId, sourceType, sourceCode, expectedAt, timestamp(), createdBy, entityId, plantId, null],
      client
  )
  return response
}

export const plannedSupplyRepository = {
  ...baseRepository,
  findById,
  findByProduct,
  tablePaginated,
  create,
  update,
  getPlannedSupplyByProduct,
  reducePlannedSupply,
  createPlannedSupply
}
