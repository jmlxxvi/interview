import { db } from '../platform/db/index.js'
import { timestamp } from '../utils/index.js'
// import { Result } from '../utils/result.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.work_order')

const findById = async (context, entityId, plantId, workOrderId, client = null) => {
  // const workOrderData = {}

  const query = `
    SELECT 
      wo.id,
      wo.code,
      wo.work_center_id,
      wc.code as work_center_code,
      wc."name" as work_center_name,
      wo.product_id,
      wo.planned_start,
      wo.planned_end,
      wo.status,
      prd.code as product_code,
      prd."name" as product_name,
      prd.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom."name" as unit_of_measure_name,
      wo.quantity,
      wo.assigned_employee_id,
      emp.full_name as assigned_employee_name,
      wo.created_at,
      us1.full_name as created_by,
      wo.updated_at,
      us2.full_name as updated_by
    FROM interview.work_order wo
    LEFT JOIN interview.work_center wc ON (wo.work_center_id = wc.id)
    INNER JOIN interview.product prd ON (wo.product_id = prd.id)
    LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
    LEFT JOIN auth.user emp ON (wo.assigned_employee_id = emp.id)
    INNER JOIN auth.user us1 ON (wo.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (wo.updated_by = us2.id)
    WHERE wo.id = $1
      AND wo.entity_id = $2
      AND wo.plant_id = $3`

  const bind = [workOrderId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const tablePaginated = async (context, entityId, plantId, search = '%', orderCol = 1, orderDir = 'asc', page = 1, size = 10, client = null) => {
  const query = `
    SELECT 
      wo.id,
      wo.code,
      wo.work_center_id,
      wc.code as work_center_code,
      wc."name" as work_center_name,
      wo.product_id,
      wo.status,
      prd.code as product_code,
      prd."name" as product_name,
      prd.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom."name" as unit_of_measure_name,
      wo.quantity,
      wo.assigned_employee_id,
      emp.full_name as assigned_employee_name,
      wo.created_at,
      us1.full_name as created_by,
      wo.updated_at,
      us2.full_name as updated_by
    FROM interview.work_order wo
    LEFT JOIN interview.work_center wc ON (wo.work_center_id = wc.id)
    INNER JOIN interview.product prd ON (wo.product_id = prd.id)
    LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
    LEFT JOIN auth.user emp ON (wo.assigned_employee_id = emp.id)
    INNER JOIN auth.user us1 ON (wo.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (wo.updated_by = us2.id)
    WHERE 1=1
      AND (
        prd."name" ILIKE concat('%', concat($1::varchar, '%')) OR
        prd.code ILIKE concat('%', concat($2::varchar, '%')) OR
        wc."name" ILIKE concat('%', concat($3::varchar, '%')) OR
        wc.code ILIKE concat('%', concat($4::varchar, '%'))
      )
        -- Entity and Plant Filter
      AND wo.entity_id = $5
      AND wo.plant_id = $6
    ORDER BY ${orderCol} ${orderDir}`

  const bind = [search, search, search, search, entityId, plantId]

  const dataCount = await db.value(`select count(*) as cnt from (${query}) inq`, bind, client)
  const dataRows = await db.query(`select * from (${query}) inq limit ${size} offset ${(page - 1) * size}`, bind, client)

  return {
    count: parseInt(dataCount),
    rows: dataRows
  }
}

const create = async (context, entityId, plantId, id, workOrderCode, workCenterId, productId, quantity, assignedEmployeeId, plannedStart, plannedEnd, status, client = null) => {
  const query = `
      INSERT INTO interview.work_order
      (id, work_center_id, product_id, quantity, assigned_employee_id, code, planned_start, planned_end, created_by, created_at, entity_id, plant_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `
  const bind = [id, workCenterId || null, productId, quantity, assignedEmployeeId || null, workOrderCode, plannedStart, plannedEnd, context.session.userId, timestamp(), entityId, plantId, status]
  const response = await db.query(query, bind, client)

  return response
}

const update = async (
  context,
  entityId,
  plantId,
  workOrderId,
  workOrderCode,
  workCenterId,
  productId,
  quantity,
  assignedEmployeeId,
  plannedStart,
  plannedEnd,
  status,
  client = null) => {
  const query = `
      UPDATE interview.work_order
      SET
        code = $1,
        work_center_id = $2,
        product_id = $3,
        quantity = $4,
        assigned_employee_id = $5,
        updated_by = $6,
        updated_at = $7,
        planned_start = $8,
        planned_end = $9,
        status = $10
      WHERE id = $11
      AND entity_id = $12
      AND plant_id = $13
      RETURNING id
    `
  const bind = [workOrderCode, workCenterId || null, productId, quantity, assignedEmployeeId || null, context.session.userId, timestamp(), plannedStart || null, plannedEnd || null, status, workOrderId, entityId, plantId]
  const response = await db.query(query, bind, client)

  return response
}

const deleteById = async (context, entityId, plantId, workOrderId, client = null) => {
  const query = `
    DELETE FROM interview.work_order
    WHERE id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `
  const bind = [workOrderId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const listAll = async (client = null) => {
  const query = `
    SELECT 
      wo.id,
      wo.work_center_id,
      wc.code as work_center_code,
      wc."name" as work_center_name,
      wo.product_id,
      prd.code as product_code,
      prd."name" as product_name,
      wo.quantity
    FROM interview.work_order wo
    LEFT JOIN interview.work_center wc ON (wo.work_center_id = wc.id)
    INNER JOIN interview.product prd ON (wo.product_id = prd.id)
    ORDER BY wo.created_at DESC
  `

  const response = await db.query(query, [], client)

  return response
}

const updateStatus = async (context, entityId, plantId, workOrderId, status, client = null) => {
  const query = `
    UPDATE interview.work_order
    SET
      status = $1,
      updated_at = $2,
      updated_by = $3
    WHERE id = $4
      AND entity_id = $5
      AND plant_id = $6
    RETURNING id
  `
  const bind = [status, timestamp(), context.session.userId, workOrderId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const getWorkOrderDetails = async (context, entityId, plantId, workOrderId, client = null) => {
  const query = `
    SELECT
      jsonb_build_object(
        'id', wo.id,
        'code', wo.code,
        'workCenterId', wo.work_center_id,
        'workCenterCode', wc.code,
        'workCenterName', wc."name",
        'productId', wo.product_id,
        'productCode', prd.code,
        'productName', prd."name",
        'unitOfMeasureId', prd.unit_of_measure_id,
        'unitOfMeasureCode', uom.code,
        'unitOfMeasureName', uom."name",
        'quantity', wo.quantity,
        'assignedEmployeeId', wo.assigned_employee_id,
        'assignedEmployeeName', emp.full_name,
        'createdAt', wo.created_at,
        'createdBy', us1.full_name,
        'updatedAt', wo.updated_at,
        'updatedBy', us2.full_name,
        'plannedStart', wo.planned_start,
        'plannedEnd', wo.planned_end,
        'status', wo.status
      ) as "workOrder",
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', bat.id,
            'batchCode', bat.code,
            'requiresQualityControl', bat.requires_quality_control,
            'workOrderId', bat.work_order_id,
            'bomId', bat.bill_of_materials_id,
            'bomVersion', bom.version,            
            'routingId', bat.routing_id,
            'routingVersion', rou.version,
            'quantity', bat.quantity,
            'status', bat.status,
            'assignedEmployeeId', bat.assigned_employee_id,
            'assignedEmployeeName', emp2.full_name,
            'plannedStartDate', bat.planned_start,
            'plannedEndDate', bat.planned_end,
            'actualStartDate', bat.actual_start,
            'actualEndDate', bat.actual_end,
            'createdAt', bat.created_at,
            'createdBy', us3.full_name,
            'updatedAt', bat.updated_at,
            'updatedBy', us4.full_name,
            'operations', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', op.id,
                    'batchOperationId', bo.id,
                    'batchId', bo.batch_id,
                    'operationId', bo.operation_id,
                    'operationCode', op.code,
                    'operationName', op.name,
                    'standardDuration', op.standard_duration,
                    'equipmentId', bo.equipment_id,
                    'equipmentCode', eq.code,
                    'equipmentName', eq.name,
                    'operatorId', bo.assigned_employee_id,
                    'operatorName', emp3.full_name,
                    'sequence', bo.sequence,
                    'status', bo.status,
                    'actualStart', bo.actual_start,
                    'actualEnd', bo.actual_end,
                    'notes', bo.notes,
                    'requiresQualityControl', bo.requires_quality_control,
                    'createdAt', bo.created_at,
                    'createdBy', us5.full_name,
                    'updatedAt', bo.updated_at,
                    'updatedBy', us6.full_name
                  ) ORDER BY bo.sequence ASC
                )
                FROM interview.batch_operation bo
                LEFT JOIN interview.operation op ON (bo.operation_id = op.id)
                LEFT JOIN interview.equipment eq ON (bo.equipment_id = eq.id)
                LEFT JOIN auth."user" emp3 ON (bo.assigned_employee_id = emp3.id)
                LEFT JOIN auth."user" us5 ON (bo.created_by = us5.id)
                LEFT JOIN auth."user" us6 ON (bo.updated_by = us6.id)
                WHERE bo.batch_id = bat.id
                  AND bo.entity_id = $2
                  AND bo.plant_id = $3
              ),
              '[]'::json
            ),
            'materials', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', bm.id,
                    'batchMaterialId', bm.id,
                    'batchId', bm.batch_id,
                    'bomItemId', bm.bill_of_materials_item_id,
                    'componentId', bm.component_id,
                    'componentCode', comp.code,
                    'componentName', comp.name,
                    'quantity', bm.quantity,
                    'unitOfMeasureId', bm.unit_of_measure_id,
                    'unitOfMeasureCode', uom2.code,
                    'unitOfMeasureName', uom2.name,
                    'vendorId', bm.vendor_id,
                    'vendorCode', ven.code,
                    'vendorName', ven.name,
                    'status', bm.status,
                    'notes', bm.notes,
                    'createdAt', bm.created_at,
                    'createdBy', us7.full_name,
                    'updatedAt', bm.updated_at,
                    'updatedBy', us8.full_name,
                    'picks', COALESCE(
                      (
                        SELECT json_agg(
                          json_build_object(
                            'id', ire.id,
                            'inventoryItemId', ire.inventory_item_id,
                            'batchId', ire.batch_id,
                            'pickQty', ire.quantity,
                            'unitOfMeasureId', ire.unit_of_measure_id,
                            'unitOfMeasureCode', uom3.code,
                            'unitOfMeasureName', uom3.name,
                            'reservedAt', ire.reserved_at,
                            'reservedBy', ire.reserved_by,
                            'reservedByName', us9.full_name,
                            'releasedAt', ire.released_at,
                            'releasedBy', ire.released_by,
                            'releasedByName', us10.full_name,
                            'status', ire.status,
                            'notes', ire.notes,
                            'productId', iit.product_id,
                            'productCode', prd2.code,
                            'productName', prd2.name,
                            'lotId', iit.lot_id,
                            'expirationAt', lot.expiration_at,
                            'lotCode', lot.code,
                            'locationId', iit.location_id,
                            'locationCode', loc.code,
                            'locationName', loc.name
                          ) ORDER BY ire.reserved_at DESC
                        )
                        FROM interview.inventory_reservation ire
                        INNER JOIN interview.inventory_item iit ON (ire.inventory_item_id = iit.id)
                        INNER JOIN interview.product prd2 ON (iit.product_id = prd2.id)
                        LEFT JOIN interview.unit_of_measure uom3 ON (ire.unit_of_measure_id = uom3.id)
                        LEFT JOIN interview.lot lot ON (iit.lot_id = lot.id)
                        INNER JOIN interview.inventory_location loc ON (iit.location_id = loc.id)
                        LEFT JOIN auth."user" us9 ON (ire.reserved_by = us9.id)
                        LEFT JOIN auth."user" us10 ON (ire.released_by = us10.id)
                        WHERE ire.batch_id = bm.batch_id
                          AND iit.product_id = bm.component_id
                          AND ire.entity_id = $2
                          AND ire.plant_id = $3
                      ),
                      '[]'::json
                    ),
                    'plans', COALESCE(
                      (
                        SELECT json_agg(p) FROM (
                          SELECT json_build_object(
                            'plannedSupplyId', ps.id,
                            'productId', ps.product_id,
                            'productCode', psprd.code,
                            'productName', psprd.name,
                            'plannedReservationId', pr.id,
                            'quantity', ps.quantity,
                            'pickQty', pr.quantity,
                            'unitOfMeasureId', psprd.unit_of_measure_id,
                            'unitOfMeasureCode', puom.code,
                            'unitOfMeasureName', puom.name,
                            'expectedAt', ps.expected_at,
                            'reservedAt', pr.reserved_at,
                            'reservedBy', pr.reserved_by,
                            'status', pr.status,
                            'sourceType', ps.source_type,
                            'sourceCode', ps.source_code,
                            'vendorId', ps.vendor_id,
                            'vendorCode', ven.code,
                            'vendorName', ven.name,
                            'createdAt', ps.created_at,
                            'createdBy', us_pls.full_name
                          ) AS p
                          FROM interview.planned_supply ps
                          JOIN interview.planned_reservation pr ON (
                            pr.planned_supply_id = ps.id
                            AND pr.batch_id = bm.batch_id
                            AND pr.entity_id = $2
                            AND pr.plant_id = $3
                          )
                          LEFT JOIN interview.vendor ven ON (ps.vendor_id = ven.id)
                          LEFT JOIN interview.product psprd ON (ps.product_id = psprd.id)
                          LEFT JOIN interview.unit_of_measure puom ON (psprd.unit_of_measure_id = puom.id)
                          LEFT JOIN auth."user" us_pls ON (ps.created_by = us_pls.id)
                          WHERE ps.product_id = bm.component_id
                            AND ps.entity_id = $2
                            AND ps.plant_id = $3
                          ORDER BY ps.expected_at ASC NULLS LAST, pr.reserved_at DESC
                        ) plans_sub
                      ),
                      '[]'::json
                    )
                  ) ORDER BY comp.name ASC
                )
                FROM interview.batch_material bm
                LEFT JOIN interview.product comp ON (bm.component_id = comp.id)
                LEFT JOIN interview.unit_of_measure uom2 ON (bm.unit_of_measure_id = uom2.id)
                LEFT JOIN interview.vendor ven ON (bm.vendor_id = ven.id)
                LEFT JOIN auth."user" us7 ON (bm.created_by = us7.id)
                LEFT JOIN auth."user" us8 ON (bm.updated_by = us8.id)
                WHERE bm.batch_id = bat.id
                  AND bm.entity_id = $2
                  AND bm.plant_id = $3
              ),
              '[]'::json      
            ),
            'qualityControls', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', qc.id,
                    'batchId', qc.batch_id,
                    'inspectedBy', qc.inspected_by,
                    'inspectedByName', us11.full_name,
                    'result', qc.result,
                    'notes', qc.notes,
                    'createdAt', qc.created_at,
                    'createdBy', us12.full_name,
                    'updatedAt', qc.updated_at,
                    'updatedBy', us13.full_name
                  ) ORDER BY qc.created_at DESC
                )
                FROM interview.quality_control qc
                LEFT JOIN auth."user" us11 ON (qc.inspected_by = us11.id)
                LEFT JOIN auth."user" us12 ON (qc.created_by = us12.id)
                LEFT JOIN auth."user" us13 ON (qc.updated_by = us13.id)
                WHERE qc.batch_id = bat.id
                  AND qc.entity_id = $2
                  AND qc.plant_id = $3
              ),
              '[]'::json
            )
          )
        ) FILTER (WHERE bat.id IS NOT NULL),
        '[]'::json
      ) as batches
    FROM interview.work_order wo
    LEFT JOIN interview.work_center wc ON (wo.work_center_id = wc.id)
    INNER JOIN interview.product prd ON (wo.product_id = prd.id)
    LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
    LEFT JOIN auth."user" emp ON (wo.assigned_employee_id = emp.id)
    INNER JOIN auth."user" us1 ON (wo.created_by = us1.id)
    LEFT JOIN auth."user" us2 ON (wo.updated_by = us2.id)
    LEFT JOIN interview.batch bat ON (wo.id = bat.work_order_id)
    LEFT JOIN interview.routing rou ON (bat.routing_id = rou.id)
    LEFT JOIN interview.bill_of_materials bom ON (bat.bill_of_materials_id = bom.id)
    LEFT JOIN auth."user" emp2 ON (bat.assigned_employee_id = emp2.id)
    LEFT JOIN auth."user" us3 ON (bat.created_by = us3.id)
    LEFT JOIN auth."user" us4 ON (bat.updated_by = us4.id)
    WHERE wo.id = $1
      -- Entity and Plant Filter
      AND wo.entity_id = $2
      AND wo.plant_id = $3
      AND (wc.entity_id = $2 OR wc.entity_id IS NULL)
      AND (wc.plant_id = $3 OR wc.plant_id IS NULL)
      AND prd.entity_id = $2
      AND prd.plant_id = $3
      AND (bat.entity_id = $2 OR bat.entity_id IS NULL)
      AND (bat.plant_id = $3 OR bat.plant_id IS NULL)
      AND (rou.entity_id = $2 OR rou.entity_id IS NULL)
      AND (rou.plant_id = $3 OR rou.plant_id IS NULL)
      AND (bom.entity_id = $2 OR bom.entity_id IS NULL)
      AND (bom.plant_id = $3 OR bom.plant_id IS NULL)
    GROUP BY 
      wo.id, wo.code, wo.work_center_id, wc.code, wc.name,
      wo.product_id, prd.code, prd.name, prd.unit_of_measure_id,
      uom.code, uom.name, wo.quantity, wo.assigned_employee_id,
      emp.full_name, wo.created_at, us1.full_name, wo.updated_at, us2.full_name`

  const bind = [workOrderId, entityId, plantId]

  const response = await db.row(query, bind, client)

  return response
}

const setStartTime = async (context, entityId, plantId, workOrderId, actualStart, client = null) => {
  const query = `
      UPDATE interview.work_order
      SET
        actual_start = $1,
        updated_at = $2,
        updated_by = $3
      WHERE id = $4
        AND entity_id = $5
        AND plant_id = $6
      RETURNING id
    `
  const bind = [actualStart, timestamp(), context.session.userId, workOrderId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

const setEndTime = async (context, entityId, plantId, workOrderId, actualEnd, client = null) => {
  const query = `
      UPDATE interview.work_order
      SET
        actual_end = $1,
        updated_at = $2,
        updated_by = $3
      WHERE id = $4
        AND entity_id = $5
        AND plant_id = $6
      RETURNING id
    `
  const bind = [actualEnd, timestamp(), context.session.userId, workOrderId, entityId, plantId]

  const response = await db.query(query, bind, client)

  return response
}

export const workOrderRepository = {
  ...baseRepository,
  findById,
  tablePaginated,
  create,
  update,
  deleteById,
  listAll,
  updateStatus,
  getWorkOrderDetails,
  setStartTime,
  setEndTime
}
