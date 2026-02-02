import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.product')

const findById = async (context, entityId, plantId, productId, client = null) => {
  const query = `
           SELECT 
            prd.id as product_id,
            prd.code as product_code,
            prd."name" as product_name,
            prd.description,
            prd.unit_of_measure_id,
            uom."name" as unit_of_measure_name,
            uom.code as unit_of_measure_code,
            prd.is_active,
            prd.shelf_life_days,
            prd.is_own,
            prd.created_at,
            us1.full_name as "created_by",
            prd.updated_at,
            us2.full_name as "updated_by"
            , COALESCE(
                (
                  SELECT json_agg(
                    jsonb_build_object(
                      'id', pv.id,
                      'vendorId', pv.vendor_id,
                      'vendorCode', v.code,
                      'vendorName', v.name,
                      'vendorProductCode', pv.vendor_product_code,
                      'leadTimeDays', pv.lead_time_days,
                      'isPreferred', pv.is_preferred
                    ) ORDER BY pv.is_preferred DESC, v.name ASC
                  )
                  FROM interview.product_vendor pv
                  INNER JOIN interview.vendor v ON (pv.vendor_id = v.id)
                  WHERE pv.product_id = prd.id
                    AND pv.is_active = true
                ),
                '[]'::json
              ) as vendors
           FROM interview.product prd
           inner join interview.unit_of_measure uom on (prd.unit_of_measure_id = uom.id)
           inner join auth.user us1 on (prd.created_by = us1.id)
           left join auth.user us2 on (prd.updated_by = us2.id)
           where 1=1
           and prd.is_active = true
           and prd.id = $1
           -- Entity and Plant filter
           AND prd.entity_id = $2
           AND prd.plant_id = $3
           AND us1.entity_id = $2
           AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
           `

  const bind = [productId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const findByIdAndVendorId = async (context, entityId, plantId, productId, vendorId, client = null) => {
  const query = `
           SELECT 
            prd.id as product_id,
            prd.code as product_code,
            prd."name" as product_name,
            prd.description,
            prd.unit_of_measure_id,
            uom."name" as unit_of_measure_name,
            uom.code as unit_of_measure_code,
            prd.is_active,
            prd.shelf_life_days,
            prd.is_own,
            ven.id as vendor_id,
            ven.code as vendor_code,
            ven.name as vendor_name,
            prd.created_at,
            us1.full_name as "created_by",
            prd.updated_at,
            us2.full_name as "updated_by"
           FROM interview.product prd
           inner join interview.unit_of_measure uom on (prd.unit_of_measure_id = uom.id)
           inner join auth.user us1 on (prd.created_by = us1.id)
           left join auth.user us2 on (prd.updated_by = us2.id)
           JOIN interview.product_vendor pv on (pv.product_id = prd.id)
           INNER JOIN interview.vendor ven ON (pv.vendor_id = ven.id)
           where 1=1
           and prd.is_active = true
           AND pv.is_active = true
           and prd.id = $1
           AND pv.vendor_id = $4
           -- Entity and Plant filter
           AND prd.entity_id = $2
           AND prd.plant_id = $3
           AND us1.entity_id = $2
           AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
           `

  const bind = [productId, entityId, plantId, vendorId]

  const response = await db.row(query, bind, client)

  return response
}

const findAll = async (context, entityId, plantId, search = null, client = null) => {
  const query = `
                     SELECT 
                        prd.id,
                        prd.code,
                        prd."name",
                        prd.description,
                        prd.unit_of_measure_id,
                        uom."name" as unit_of_measure_name,
                        uom.code as unit_of_measure_code,
                        prd.is_active,
                        prd.shelf_life_days,
                        prd.is_own,
                        prd.created_at,
                        us1.full_name as "created_by",
                        prd.updated_at,
                        us2.full_name as "updated_by"
                     FROM interview.product prd
                     inner join interview.unit_of_measure uom on (prd.unit_of_measure_id = uom.id)
                     inner join auth.user us1 on (prd.created_by = us1.id)
                     left join auth.user us2 on (prd.updated_by = us2.id)
                     where 1=1
                     and prd.is_active = true
                     -- Entity and Plant filter
                     AND prd.entity_id = $1
                     AND prd.plant_id = $2
                     AND us1.entity_id = $1
                     AND (us2.entity_id = $1 OR us2.entity_id IS NULL)
                     ${search ? 'AND (prd."name" ILIKE $3 OR prd.code ILIKE $3)' : ''}
                     ORDER BY prd."name" ASC`

  const bind = search ? [entityId, plantId, `%${search}%`] : [entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const findByNameOrCode = async (context, entityId, plantId, search = null, isOwn = null, client = null) => {
  let query = `
              SELECT 
                    prd.id,
                    prd.code,
                    prd."name",
                    prd.description,
                    prd.unit_of_measure_id,
                    uom."name" as unit_of_measure_name,
                    uom.code as unit_of_measure_code,
                    prd.is_active,
                    prd.shelf_life_days,
                    prd.is_own,
                    COALESCE(
                      (
                        SELECT json_agg(
                          jsonb_build_object(
                            'id', pv2.id,
                            'vendorId', pv2.vendor_id,
                            'vendorCode', v2.code,
                            'vendorName', v2.name,
                            'vendorProductCode', pv2.vendor_product_code,
                            'leadTimeDays', pv2.lead_time_days,
                            'isPreferred', pv2.is_preferred
                          ) ORDER BY pv2.is_preferred DESC, v2.name ASC
                        )
                        FROM interview.product_vendor pv2
                        INNER JOIN interview.vendor v2 ON (pv2.vendor_id = v2.id)
                        WHERE pv2.product_id = prd.id 
                          AND pv2.is_active = true
                      ),
                      '[]'::json
                    ) as vendors
                FROM interview.product prd
                    INNER JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
                WHERE prd.is_active = true`

  const bind = search ? [entityId, plantId] : [entityId, plantId]

  if (search) {
    query += ` AND (prd."name" ILIKE concat('%', concat($${bind.length + 1}::varchar, '%')) OR prd.code ILIKE concat('%', concat($${bind.length + 1}::varchar, '%')))`
    bind.push(`%${search}%`)
  }

  if (isOwn) {
    query += ` AND (prd.is_own = $${bind.length + 1} OR $${bind.length + 1} IS NULL)`
    bind.push(isOwn)
  }

  query += `
            -- Entity and Plant filter
            AND prd.entity_id = $1
            AND prd.plant_id = $2
            LIMIT 5`

  console.log('query: ', query)
  const response = await db.query(query, bind, client)

  return response
}

const tablePaginated = async (entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
            SELECT 
            prd.id,
            prd.code,
            prd."name",
            prd.description,
            prd.unit_of_measure_id,
            uom."name" as unit_of_measure_name,
            uom.code as unit_of_measure_code,
            prd.is_active,
            prd.shelf_life_days,
            prd.is_own,
            prd.created_at,
            us1.full_name as "created_by",
            prd.updated_at,
            us2.full_name as "updated_by"
           FROM interview.product prd
           inner join interview.unit_of_measure uom on (prd.unit_of_measure_id = uom.id)
           inner join auth.user us1 on (prd.created_by = us1.id)
           left join auth.user us2 on (prd.updated_by = us2.id)
           where 1=1
           AND prd.is_active = true
           -- Entity and Plant filter
           AND prd.entity_id = $4
           AND prd.plant_id = $5
           AND us1.entity_id = $4
           AND (us2.entity_id = $4 OR us2.entity_id IS NULL)
            AND (
                prd."name" ILIKE concat('%', concat($1::varchar, '%')) OR
                prd.code ILIKE concat('%', concat($2::varchar, '%')) OR
                prd.description ILIKE concat('%', concat($3::varchar, '%'))
            )
            ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, client = null) => {
  const query = `
            INSERT INTO interview.product
            (id, code, "name", description, unit_of_measure_id, shelf_life_days, is_own, created_by, created_at, is_active, entity_id, plant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11)
            RETURNING id
        `
  const bind = [productId, code, name, description, unitOfMeasureId, shelfLifeDays || null, isOwn, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (context, entityId, plantId, productId, code, name, description, unitOfMeasureId, shelfLifeDays, isOwn, client = null) => {
  const query = `
            UPDATE interview.product
            SET
              code = $1,
              "name" = $2,
              description = $3,
              unit_of_measure_id = $4,
              shelf_life_days = $5,
              is_own = $6,
              updated_by = $7,
              updated_at = $8
            WHERE id = $9
            -- Entity and Plant filter
            AND entity_id = $10
            AND plant_id = $11
            RETURNING id
        `
  const bind = [code, name, description, unitOfMeasureId, shelfLifeDays || null, isOwn, context.session.userId, timestamp(), productId, entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

// Vendor functions
const addVendor = async (context, entityId, plantId, productId, vendorId, vendorProductCode, leadTimeDays, isPreferred, client = null) => {
  const query = `
    INSERT INTO interview.product_vendor
    (product_id, vendor_id, vendor_product_code, lead_time_days, is_preferred, created_by, created_at, is_active, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
    RETURNING id
  `
  const bind = [productId, vendorId, vendorProductCode || null, leadTimeDays || null, isPreferred || false, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const updateVendor = async (context, productVendorId, vendorProductCode, leadTimeDays, isPreferred, client = null) => {
  const query = `
    UPDATE interview.product_vendor
    SET
      vendor_product_code = $1,
      lead_time_days = $2,
      is_preferred = $3,
      updated_by = $4,
      updated_at = $5
    WHERE id = $6
    RETURNING id
  `
  const bind = [vendorProductCode || null, leadTimeDays || null, isPreferred || false, context.session.userId, timestamp(), productVendorId]

  const response = await db.query(query, bind, client)

  return response
}

const mergeVendor = async (context, productId, vendorId, vendorProductCode, leadTimeDays, isPreferred, client = null) => {
  const query = `
        INSERT INTO interview.product_vendor
        (product_id, vendor_id, vendor_product_code, lead_time_days, is_preferred, created_by, created_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (product_id, vendor_id)
        DO UPDATE SET
            vendor_product_code = EXCLUDED.vendor_product_code,
            lead_time_days = EXCLUDED.lead_time_days,
            is_preferred = EXCLUDED.is_preferred,
            updated_by = $6,
            updated_at = $7,
            is_active = true
        RETURNING id
    `
  const bind = [productId, vendorId, vendorProductCode || null, leadTimeDays || null, isPreferred || false, context.session.userId, timestamp()]

  const response = await db.query(query, bind, client)

  return response
}

const removeVendor = async (productVendorId, client = null) => {
  const query = `
    UPDATE interview.product_vendor
    SET is_active = false
    WHERE id = $1
    RETURNING id
  `
  const bind = [productVendorId]

  const response = await db.query(query, bind, client)

  return response
}

const getVendors = async (productId, client = null) => {
  const query = `
    SELECT 
      pv.id,
      pv.product_id,
      pv.vendor_id,
      v.code as vendor_code,
      v.name as vendor_name,
      pv.vendor_product_code,
      pv.lead_time_days,
      pv.is_preferred,
      pv.is_active,
      pv.created_at,
      us1.full_name as created_by,
      pv.updated_at,
      us2.full_name as updated_by
    FROM interview.product_vendor pv
    INNER JOIN interview.vendor v ON (pv.vendor_id = v.id)
    INNER JOIN auth.user us1 ON (pv.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (pv.updated_by = us2.id)
    WHERE pv.product_id = $1
      AND pv.is_active = true
    ORDER BY pv.is_preferred DESC, v.name ASC
  `
  const bind = [productId]

  const response = await db.query(query, bind, client)

  return response
}

const removeProductVendors = async (context, entityId, plantId, productId, client = null) => {
  const query = `
    DELETE FROM interview.product_vendor
    WHERE product_id = $1
      AND entity_id = $2
      AND plant_id = $3`

  const bind = [productId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const removeProductRoutings = async (context, entityId, plantId, productId, client = null) => {
  const query = `
    DELETE FROM interview.routing
    WHERE product_id = $1
      AND entity_id = $2
      AND plant_id = $3`

  const bind = [productId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const removeProductBOMs = async (context, entityId, plantId, productId, client = null) => {
  const query = `
    DELETE FROM interview.bill_of_materials
    WHERE product_id = $1
      AND entity_id = $2
      AND plant_id = $3`

  const bind = [productId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

// Bill of Materials functions
const getBOM = async (context, entityId, plantId, productId, client = null) => {
  const query = `
        SELECT 
            bom.id as bom_id,
            bom.version,
            COALESCE(
                json_agg(
                    json_build_object(
                        'bomItemId', bomi.id,
                        'componentId', bomi.component_id,
                        'componentCode', p.code,
                        'componentName', p.name,
                        'quantity', bomi.quantity,
                        'unitOfMeasureId', bomi.unit_of_measure_id,
                        'unitOfMeasureCode', uom.code,
                        'unitOfMeasureName', uom.name,
                        'vendorId', bomi.vendor_id,
                        'vendorCode', ven.code,
                        'vendorName', ven.name,
                        'createdAt', bomi.created_at,
                        'createdBy', us1.full_name,
                        'updatedAt', bomi.updated_at,
                        'updatedBy', us2.full_name
                    ) ORDER BY p.name ASC
                ) FILTER (WHERE bomi.id IS NOT NULL),
                '[]'::json
            ) as items
        FROM interview.bill_of_materials bom
        LEFT JOIN interview.bill_of_materials_item bomi ON (bom.id = bomi.bill_of_materials_id)
        LEFT JOIN interview.product p ON (bomi.component_id = p.id)
        LEFT JOIN interview.unit_of_measure uom ON (bomi.unit_of_measure_id = uom.id)
        LEFT JOIN interview.vendor ven ON (bomi.vendor_id = ven.id)
        LEFT JOIN auth.user us1 ON (bomi.created_by = us1.id)
        LEFT JOIN auth.user us2 ON (bomi.updated_by = us2.id)
        WHERE bom.product_id = $1
        -- Entity and Plant filter
        AND bom.entity_id = $2
        AND bom.plant_id = $3
        AND us1.entity_id = $2
        AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
        GROUP BY bom.id, bom.version
  `
  const bind = [productId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const createBOM = async (context, entityId, plantId, id, productId, version, client = null) => {
  const query = `
    INSERT INTO interview.bill_of_materials
    (id, product_id, version, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `
  const bind = [id, productId, version, context.session.userId, timestamp(), entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const removeBOM = async (context, bomId, client = null) => {
  const query = `
    DELETE FROM interview.bill_of_materials
    WHERE id = $1
    RETURNING id
  `
  const bind = [bomId]

  const response = await db.query(query, bind, client)

  return response
}

const addBOMItem = async (context, entityId, plantId, id, bomId, componentId, quantity, unitOfMeasureId, vendorId, client = null) => {
  const query = `
    INSERT INTO interview.bill_of_materials_item
    (id, bill_of_materials_id, component_id, quantity, unit_of_measure_id, vendor_id, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `
  const bind = [id, bomId, componentId, quantity, unitOfMeasureId, vendorId, context.session.userId, timestamp(), entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const updateBOMItem = async (context, bomItemId, quantity, unitOfMeasureId, client = null) => {
  const query = `
    UPDATE interview.bill_of_materials_item
    SET
      quantity = $1,
      unit_of_measure_id = $2,
      updated_by = $3,
      updated_at = $4
    WHERE id = $5
    RETURNING id
  `
  const bind = [quantity, unitOfMeasureId, context.session.userId, timestamp(), bomItemId]

  const response = await db.query(query, bind, client)

  return response
}

const removeBOMItem = async (context, bomId, bomItemId, client = null) => {
  const query = `
    DELETE FROM interview.bill_of_materials_item
    WHERE id = $1 AND bill_of_materials_id = $2
    RETURNING id
  `
  const bind = [bomItemId, bomId]

  const response = await db.query(query, bind, client)

  return response
}

// Routing functions
const getRouting = async (context, entityId, plantId, productId, client = null) => {
  const query = `
    SELECT 
      rou.product_id,
      rou.id as routing_id,
      rou.version,
      COALESCE(
        json_agg(
          json_build_object(
            'routingOperationId', rouop.id,
            'operationId', rouop.operation_id,
            'operationCode', op.code,
            'operationName', op.name,
            'equipmentId', rouop.equipment_id,
            'equipmentCode', eq.code,
            'equipmentName', eq.name,
            'sequence', rouop.sequence,
            'requiresQualityControl', rouop.requires_quality_control,
            'createdAt', rouop.created_at,
            'createdBy', us1.full_name,
            'updatedAt', rouop.updated_at,
            'updatedBy', us2.full_name
          ) ORDER BY rouop.created_at ASC
        ) FILTER (WHERE rouop.id IS NOT NULL),
        '[]'::json
      ) as operations
    FROM interview.routing rou
    LEFT JOIN interview.routing_operation rouop ON (rou.id = rouop.routing_id)
    LEFT JOIN interview.operation op ON (rouop.operation_id = op.id)
    LEFT JOIN interview.equipment eq ON (rouop.equipment_id = eq.id)
    LEFT JOIN auth.user us1 ON (rouop.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (rouop.updated_by = us2.id)
    WHERE rou.product_id = $1
    -- Entity and Plant filter
    AND rou.entity_id = $2
    AND rou.plant_id = $3
    AND us1.entity_id = $2
    AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
    GROUP BY rou.id, rou.version
    ORDER by rou.created_at DESC
  `
  const bind = [productId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const createRouting = async (context, entityId, plantId, id, productId, version, client = null) => {
  const query = `
    INSERT INTO interview.routing
    (id, product_id, version, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `
  const bind = [id, productId, version, context.session.userId, timestamp(), entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const removeRouting = async (context, routingId, client = null) => {
  const query = `
    DELETE FROM interview.routing
    WHERE id = $1
    RETURNING id
  `
  const bind = [routingId]

  const response = await db.query(query, bind, client)

  return response
}

const addRoutingOperation = async (context, entityId, plantId, routingId, operationId, equipmentId, sequence, requiresQualityControl, client = null) => {
  const query = `
    INSERT INTO interview.routing_operation
    (routing_id, operation_id, equipment_id, sequence, requires_quality_control, created_by, created_at, entity_id, plant_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `
  const bind = [routingId, operationId, equipmentId || null, sequence, requiresQualityControl !== false, context.session.userId, timestamp(), entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const updateRoutingOperation = async (context, routingOperationId, equipmentId, sequence, requiresQualityControl, client = null) => {
  const query = `
    UPDATE interview.routing_operation
    SET
      equipment_id = $1,
      sequence = $2,
      requires_quality_control = $3,
      updated_by = $4,
      updated_at = $5
    WHERE id = $6
    RETURNING id
  `
  const bind = [equipmentId || null, sequence, requiresQualityControl !== false, context.session.userId, timestamp(), routingOperationId]

  const response = await db.query(query, bind, client)

  return response
}

const removeRoutingOperation = async (context, routingId, routingOperationId, client = null) => {
  const query = `
    DELETE FROM interview.routing_operation
    WHERE id = $1 AND routing_id = $2
    RETURNING id
  `
  const bind = [routingOperationId, routingId]

  const response = await db.query(query, bind, client)

  return response
}

const getProductDetails = async (context, entityId, plantId, productId, client = null) => {
  const query = `
    SELECT
      jsonb_build_object(
        'productId', prd.id,
        'productCode', prd.code,
        'productName', prd.name,
        'description', prd.description,
        'unitOfMeasureId', prd.unit_of_measure_id,
        'unitOfMeasureName', uom.name,
        'unitOfMeasureCode', uom.code,
        'isActive', prd.is_active,
        'shelfLifeDays', prd.shelf_life_days,
        'isOwn', prd.is_own,
        'createdAt', prd.created_at,
        'createdBy', us1.full_name,
        'updatedAt', prd.updated_at,
        'updatedBy', us2.full_name
      ) as product,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', pv.id,
            'productId', pv.product_id,
            'vendorId', pv.vendor_id,
            'vendorCode', v.code,
            'vendorName', v.name,
            'vendorProductCode', pv.vendor_product_code,
            'leadTimeDays', pv.lead_time_days,
            'isPreferred', pv.is_preferred,
            'isActive', pv.is_active,
            'createdAt', pv.created_at,
            'createdBy', us3.full_name,
            'updatedAt', pv.updated_at,
            'updatedBy', us4.full_name
          ) -- ORDER BY pv.is_preferred DESC, v.name ASC
        ) FILTER (WHERE pv.id IS NOT NULL),
        '[]'::json
      ) as vendors,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'bomId', bom.id,
            'version', bom.version,
            'createdAt', bom.created_at,
            'createdBy', us5.full_name,
            'updatedAt', bom.updated_at,
            'updatedBy', us6.full_name,
            'items', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'bomItemId', bomi.id,
                    'componentId', bomi.component_id,
                    'componentCode', p2.code,
                    'componentName', p2.name,
                    'vendorId', v2.id,
                    'vendorCode', v2.code,
                    'vendorName', v2.name,
                    'quantity', bomi.quantity,
                    'unitOfMeasureId', bomi.unit_of_measure_id,
                    'unitOfMeasureCode', uom2.code,
                    'unitOfMeasureName', uom2.name,
                    'createdAt', bomi.created_at,
                    'createdBy', us7.full_name,
                    'updatedAt', bomi.updated_at,
                    'updatedBy', us8.full_name
                  ) -- ORDER BY p2.name ASC
                )
                FROM interview.bill_of_materials_item bomi
                LEFT JOIN interview.product p2 ON (bomi.component_id = p2.id)
                LEFT JOIN interview.unit_of_measure uom2 ON (bomi.unit_of_measure_id = uom2.id)
                LEFT JOIN auth.user us7 ON (bomi.created_by = us7.id)
                LEFT JOIN auth.user us8 ON (bomi.updated_by = us8.id)
                LEFT JOIN interview.vendor v2 ON (bomi.vendor_id = v2.id)
                WHERE bomi.bill_of_materials_id = bom.id
              ),
              '[]'::json
            )
          )
        ) FILTER (WHERE bom.id IS NOT NULL),
        '[]'::json
      ) as boms,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'routingId', rou.id,
            'version', rou.version,
            'createdAt', rou.created_at,
            'createdBy', us9.full_name,
            'updatedAt', rou.updated_at,
            'updatedBy', us10.full_name,
            'operations', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'routingOperationId', rouop.id,
                    'operationId', rouop.operation_id,
                    'operationCode', op.code,
                    'operationName', op.name,
                    'equipmentId', rouop.equipment_id,
                    'equipmentCode', eq.code,
                    'equipmentName', eq.name,
                    'sequence', rouop.sequence,
                    'requiresQualityControl', rouop.requires_quality_control,
                    'createdAt', rouop.created_at,
                    'createdBy', us11.full_name,
                    'updatedAt', rouop.updated_at,
                    'updatedBy', us12.full_name
                  ) -- ORDER BY rouop.sequence ASC
                )
                FROM interview.routing_operation rouop
                LEFT JOIN interview.operation op ON (rouop.operation_id = op.id)
                LEFT JOIN interview.equipment eq ON (rouop.equipment_id = eq.id)
                LEFT JOIN auth.user us11 ON (rouop.created_by = us11.id)
                LEFT JOIN auth.user us12 ON (rouop.updated_by = us12.id)
                WHERE rouop.routing_id = rou.id
              ),
              '[]'::json
            )
          ) -- ORDER BY rou.created_at DESC
        ) FILTER (WHERE rou.id IS NOT NULL),
        '[]'::json
      ) as routings
    FROM interview.product prd
    INNER JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
    INNER JOIN auth.user us1 ON (prd.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (prd.updated_by = us2.id)
    LEFT JOIN interview.product_vendor pv ON (prd.id = pv.product_id AND pv.is_active = true)
    LEFT JOIN interview.vendor v ON (pv.vendor_id = v.id)
    LEFT JOIN auth.user us3 ON (pv.created_by = us3.id)
    LEFT JOIN auth.user us4 ON (pv.updated_by = us4.id)
    LEFT JOIN interview.bill_of_materials bom ON (prd.id = bom.product_id)
    LEFT JOIN auth.user us5 ON (bom.created_by = us5.id)
    LEFT JOIN auth.user us6 ON (bom.updated_by = us6.id)
    LEFT JOIN interview.routing rou ON (prd.id = rou.product_id)
    LEFT JOIN auth.user us9 ON (rou.created_by = us9.id)
    LEFT JOIN auth.user us10 ON (rou.updated_by = us10.id)
    WHERE prd.id = $1
      AND prd.is_active = true
      -- Entity and Plant filter
      AND prd.entity_id = $2
      AND prd.plant_id = $3
      AND us1.entity_id = $2
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
      AND (v.entity_id = $2 OR v.entity_id IS NULL)
      AND (v.plant_id = $3 OR v.plant_id IS NULL)
      AND (bom.entity_id = $2 OR bom.entity_id IS NULL)
      AND (bom.plant_id = $3 OR bom.plant_id IS NULL)
      AND (rou.entity_id = $2 OR rou.entity_id IS NULL)
      AND (rou.plant_id = $3 OR rou.plant_id IS NULL)
      AND (pv.entity_id = $2 OR pv.entity_id IS NULL)
      AND (pv.plant_id = $3 OR pv.plant_id IS NULL)
    GROUP BY
      prd.id, prd.code, prd.name, prd.description, prd.unit_of_measure_id,
      uom.name, uom.code, prd.is_active, prd.shelf_life_days, prd.is_own,
      prd.created_at, us1.full_name, prd.updated_at, us2.full_name
  `
  const bind = [productId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

export const productRepository = {
  ...baseRepository,
  findById,
  findByIdAndVendorId,
  findAll,
  findByNameOrCode,
  tablePaginated,
  create,
  update,
  addVendor,
  removeProductVendors,
  removeProductRoutings,
  removeProductBOMs,
  updateVendor,
  mergeVendor,
  removeVendor,
  getVendors,
  getBOM,
  createBOM,
  removeBOM,
  addBOMItem,
  updateBOMItem,
  removeBOMItem,
  getRouting,
  createRouting,
  removeRouting,
  addRoutingOperation,
  updateRoutingOperation,
  removeRoutingOperation,
  getProductDetails
}
