import log from '../platform/log.js'
import { db } from '../platform/db/index.js'
import { plannedSupplyRepository } from '../repositories/plannedSupply.js'

/*
AVailability Service

This service provides functions to calculate product availability
at specific points in time, as well as time-phased availability
buckets.
*/

/**
 * Get product availability at a given time WITHOUT modifying state.
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {number} params.asOfEpoch - unix epoch seconds
 */
export async function getProductAvailabilityAtDate ({
  entityId,
  plantId,
  productId,
  vendorId,
  asOfEpoch = Number.MAX_SAFE_INTEGER
}) {
  const client = await db.acquireClient()

  try {
    // -----------------------
    // 1) On-hand inventory
    // -----------------------
    const onHandRow = await db.row(
      `
      SELECT COALESCE(SUM(quantity), 0)::numeric AS qty
      FROM interview.inventory_item
      WHERE product_id = $1
      AND vendor_id = $2
      AND entity_id = $3
      AND plant_id = $4
      `,
      [productId, vendorId, entityId, plantId],
      client
    )

    const onHand = parseFloat(onHandRow.qty || 0)

    // -----------------------
    // 2) Inventory reservations (physical)
    // -----------------------
    const invResRow = await db.row(
      `
      SELECT COALESCE(SUM(quantity), 0)::numeric AS qty
      FROM interview.inventory_reservation
      WHERE inventory_item_id IN (
        SELECT id 
        FROM interview.inventory_item WHERE product_id = $1
          AND vendor_id = $2
          AND entity_id = $3
          AND plant_id = $4
      )
      AND status = 'RESERVED'
      AND reserved_at <= $5
      AND entity_id = $3
      AND plant_id = $4
      `,
      [productId, vendorId, entityId, plantId, asOfEpoch],
      client
    )

    const inventoryReserved = parseFloat(invResRow.qty || 0)

    // -----------------------
    // 3) Planned supply
    // -----------------------
    const plannedSupplyRow = await db.row(
      `
      SELECT COALESCE(SUM(quantity), 0)::numeric AS qty
      FROM interview.planned_supply
      WHERE product_id = $1
        AND vendor_id = $5
        AND expected_at <= $2
        AND status IN ('PLANNED', 'CONFIRMED')
        AND entity_id = $3
        AND plant_id = $4
      `,
      [productId, asOfEpoch, entityId, plantId, vendorId],
      client
    )

    const plannedSupply = parseFloat(plannedSupplyRow.qty || 0)

    // -----------------------
    // 4) Planned reservations (MRP allocations)
    // -----------------------
    const plannedResRow = await db.row(
      `
      SELECT COALESCE(SUM(quantity), 0)::numeric AS qty
      FROM interview.planned_reservation pr
      JOIN interview.planned_supply ps ON ps.id = pr.planned_supply_id
      WHERE ps.product_id = $1
        AND ps.vendor_id = $5
        AND ps.entity_id = $3
        AND ps.plant_id = $4
        AND pr.status IN ('PLANNED', 'CONFIRMED')
        AND pr.reserved_at <= $2
      `,
      [productId, asOfEpoch, entityId, plantId, vendorId],
      client
    )

    const plannedReserved = parseFloat(plannedResRow.qty || 0)

    // -----------------------
    // Final calculation
    // -----------------------
    const netAvailable =
      onHand +
      plannedSupply -
      inventoryReserved -
      plannedReserved

    await db.commit(client)

    return {
      productId,
      asOfEpoch,
      onHand,
      inventoryReserved,
      plannedSupply,
      plannedReserved,
      netAvailable
    }
  } catch (err) {
    await db.rollback(client)
    log.error('Error in getProductAvailabilityAtDate:', err)
    throw err
  } finally {
    await db.releaseClient(client)
  }
}

/* helpers */

/**
 * Get the start of the week (Monday) for a given timestamp in UTC
 * @param {number} timestamp - Unix timestamp with milliseconds
 * @returns {Date} Date object representing Monday of that week in UTC
 */
function getWeekStartDateUTC (timestamp) {
  const date = new Date(timestamp)
  const day = date.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Adjust to previous Monday (if day is Sunday, go back 6 days)
  const diff = day === 0 ? -6 : 1 - day

  // Get UTC components
  const utcYear = date.getUTCFullYear()
  const utcMonth = date.getUTCMonth()
  const utcDate = date.getUTCDate()

  // Create new date for Monday at start of day in UTC
  const monday = new Date(Date.UTC(utcYear, utcMonth, utcDate + diff, 0, 0, 0, 0))

  return monday
}

/**
 * Format date as YYYY-MM-DD in UTC
 * @param {Date} date - Date object
 * @returns {string} Formatted date string in UTC
 */
function formatDateUTC (date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Helper function to create UTC timestamps from date strings
 */
function dateToUTCTimestamp (dateString) {
// dateString format: "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function getDateFromTimestamp (timestamp) {
  return new Date(timestamp).toISOString().split('T')[0]
}

/* DAYS */
function getDaysBetweenTimestampsUTC (startTimestamp, endTimestamp) {
  // Validate inputs
  if (typeof startTimestamp !== 'number' || typeof endTimestamp !== 'number') {
    throw new Error('Both timestamps must be numbers')
  }

  if (startTimestamp > endTimestamp) {
    [startTimestamp, endTimestamp] = [endTimestamp, startTimestamp]
  }

  const daysArray = []

  // Use UTC to avoid timezone issues
  const currentDate = new Date(startTimestamp)
  currentDate.setUTCHours(0, 0, 0, 0)

  const endDate = new Date(endTimestamp)
  endDate.setUTCHours(0, 0, 0, 0)

  while (currentDate <= endDate) { // eslint-disable-line no-unmodified-loop-condition
    const year = currentDate.getUTCFullYear()
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getUTCDate()).padStart(2, '0')

    daysArray.push(`${year}-${month}-${day}`)

    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }

  return daysArray
}

/* WEEKS */
/**
 * Get weeks between two timestamps (UTC-based)
 * @param {number} startTimestamp - Unix timestamp with milliseconds
 * @param {number} endTimestamp - Unix timestamp with milliseconds
 * @returns {Array} Array of objects with week number and date ranges
 */
function getWeeksBetweenTimestampsUTC (startTimestamp, endTimestamp) {
  if (startTimestamp > endTimestamp) {
    throw new Error('Start timestamp must be before or equal to end timestamp')
  }

  const weeks = []
  const currentWeekStart = getWeekStartDateUTC(startTimestamp)
  let weekNumber = 1

  // Get UTC end date and adjust to end of day
  const endDate = new Date(endTimestamp)
  const utcYear = endDate.getUTCFullYear()
  const utcMonth = endDate.getUTCMonth()
  const utcDate = endDate.getUTCDate()
  const endOfDayUTC = Date.UTC(utcYear, utcMonth, utcDate, 23, 59, 59, 999)

  while (currentWeekStart.getTime() <= endOfDayUTC) {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6) // Add 6 days to get end of week (Sunday)

    // Format dates as YYYY-MM-DD in UTC
    const startDay = formatDateUTC(currentWeekStart)
    const endDay = formatDateUTC(weekEnd)

    weeks.push({
      week: weekNumber,
      startDay,
      endDay
    })

    // Move to next week
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7)
    weekNumber++
  }

  return weeks
}

/* MONTHS */
function getMonthsBetweenTimestampsUTC (startTimestamp, endTimestamp) {
  if (startTimestamp > endTimestamp) {
    throw new Error('Start timestamp must be before or equal to end timestamp')
  }

  const months = []
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Get start date in UTC
  const startDate = new Date(startTimestamp)
  const endDate = new Date(endTimestamp)

  // Get UTC start year and month
  let currentYear = startDate.getUTCFullYear()
  let currentMonth = startDate.getUTCMonth()

  // Get UTC end year and month (adjusted to end of month)
  const endYear = endDate.getUTCFullYear()
  const endMonth = endDate.getUTCMonth()

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    // Get first day of month
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1))

    // Get last day of month
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999))

    // Format dates as YYYY-MM-DD
    const startDay = formatDateUTC(firstDayOfMonth)
    const endDay = formatDateUTC(lastDayOfMonth)

    months.push({
      year: currentYear,
      monthNumber: currentMonth + 1, // 1-indexed for display
      monthName: monthNames[currentMonth],
      startDay,
      endDay
    })

    // Move to next month
    currentMonth++
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
  }

  return months
}

function getNextPeriodsUTCCustom (referenceTimestamp = Date.now(), numWeeks = 8, numMonths = 12) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const referenceDate = new Date(referenceTimestamp)
  const utcYear = referenceDate.getUTCFullYear()
  const utcMonth = referenceDate.getUTCMonth()
  const utcDate = referenceDate.getUTCDate()

  const startOfReferenceDay = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0))

  // Calculate weeks
  const weeks = []
  const currentWeekStart = getWeekStartDateUTC(startOfReferenceDay.getTime())

  for (let weekNumber = 1; weekNumber <= numWeeks; weekNumber++) {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

    weeks.push({
      week: weekNumber,
      startDay: formatDateUTC(currentWeekStart),
      endDay: formatDateUTC(weekEnd)
    })

    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7)
  }

  // Calculate months
  const months = []
  let currentYear = utcYear
  let currentMonth = utcMonth
  let currentMonthStart = new Date(Date.UTC(currentYear, currentMonth, 1))

  for (let monthNumber = 1; monthNumber <= numMonths; monthNumber++) {
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0))

    months.push({
      year: currentYear,
      monthNumber: currentMonth + 1,
      monthName: monthNames[currentMonth],
      startDay: formatDateUTC(currentMonthStart),
      endDay: formatDateUTC(lastDayOfMonth)
    })

    currentMonth++
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
    currentMonthStart = new Date(Date.UTC(currentYear, currentMonth, 1))
  }

  return {
    weeks,
    months,
    referenceDate: formatDateUTC(referenceDate)
  }
}

/**
 * Build time-phased availability buckets for a product
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {number} params.startEpoch
 * @param {number} params.endEpoch
 * @param {number} params.bucketSizeSeconds (e.g. 86400 = daily)
 */
export async function getMaterialAvailability (
  context,
  entityId,
  plantId,
  productId,
  vendorId,
  startEpoch,
  endEpoch,
  client = null
) {
  const productDetails = await productRepository.findByIdAndVendorId(context, entityId, plantId, productId, vendorId, client)
  console.log('productDetails: ', productDetails)

  // -----------------------
  // 1) Initial on-hand
  // -----------------------
  const onHandRow = await db.row(
    `
    SELECT COALESCE(SUM(quantity),0)::numeric AS qty
    FROM interview.inventory_item
    WHERE product_id = $1
    AND vendor_id = $2
    AND entity_id = $3
    AND plant_id = $4
    `,
    [productId, vendorId, entityId, plantId],
    client
  )

  const inventoryAvailable = parseFloat(onHandRow.qty || 0)

  // -----------------------
  // 2) Inventory reservations (physical)
  // -----------------------
  const inventoryReserved = await db.query(
    `
    SELECT reserved_at AS ts, quantity
    FROM interview.inventory_reservation
    WHERE inventory_item_id IN (
      SELECT id FROM interview.inventory_item WHERE product_id = $1 AND vendor_id = $4 AND entity_id = $5 AND plant_id = $6
    )
      AND status = 'RESERVED'
      AND reserved_at BETWEEN $2 AND $3
      AND entity_id = $5
      AND plant_id = $6
    `,
    [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
    client
  )

  // -----------------------
  // 3) Planned supply (MRP)
  // -----------------------

  const plannedSupply = await db.query(
    `
    SELECT expected_at AS ts, quantity
    FROM interview.planned_supply
    WHERE product_id = $1
      AND vendor_id = $4
      AND expected_at BETWEEN $2 AND $3
      AND status IN ('PLANNED','CONFIRMED')
      AND entity_id = $5
      AND plant_id = $6
    `,
    [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
    client
  )

  // -----------------------
  // 4) Planned reservations (MRP)
  // -----------------------
  const plannedReserved = await db.query(
    `
    SELECT pr.reserved_at AS ts, pr.quantity
    FROM interview.planned_reservation pr
    JOIN interview.planned_supply ps ON ps.id = pr.planned_supply_id
    WHERE ps.product_id = $1
      AND ps.vendor_id = $4
      AND ps.entity_id = $5
      AND ps.plant_id = $6
      AND pr.reserved_at BETWEEN $2 AND $3
      AND pr.status IN ('PLANNED','CONFIRMED')
    `,
    [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
    client
  )

  // -----------------------
  // 5) Future requirements (work orders)
  // -----------------------
  const futureRequirements = await db.query(
    `
     SELECT
      bat.planned_start as batch_planned_start,
      bat.quantity,
      bat.entity_id,
      bat.plant_id,
      bat.id AS batch_id,
      bat.code AS batch_code,
      bat.work_order_id,
      bm.component_id,
      prd.code AS component_code,
      prd.name AS component_name,
      uom.id AS unit_of_measure_id,
      uom.code AS unit_of_measure_code,
      uom.name AS unit_of_measure_name,
      v.id AS vendor_id,
      v.code AS vendor_code,
      v.name AS vendor_name,
      wo.code AS work_order_code,
      wo.product_id AS finished_product_id,
      wo.planned_start,
      wo.planned_end,
      to_timestamp(wo.planned_start/1000) AS planned_start_ts,
      to_timestamp(wo.planned_end/1000) AS planned_end_ts
    FROM interview.batch bat
    JOIN interview.batch_material bm ON bm.batch_id = bat.id
    LEFT JOIN interview.product prd ON prd.id = bm.component_id
    LEFT JOIN interview.unit_of_measure uom ON uom.id = prd.unit_of_measure_id
    JOIN interview.product_vendor pv ON pv.product_id = prd.id
    JOIN interview.vendor v ON v.id = pv.vendor_id
    JOIN interview.work_order wo ON wo.id = bat.work_order_id
    WHERE 1=1
      AND prd.id = $1
      AND pv.vendor_id = $4
      AND wo.planned_start BETWEEN $2 AND $3
      -- Entity / Plant filters
      AND bat.entity_id = $5
      AND bat.plant_id = $6
      AND bm.entity_id = $5
      AND bm.plant_id = $6
    ORDER BY bat.planned_start ASC
    `,
    [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
    client
  )

  return {
    inventoryAvailable,
    inventoryReserved,
    plannedSupply,
    plannedReserved,
    futureRequirements,
    productDetails
  }
}

/**
 * Build time-phased availability buckets for a product
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {number} params.startEpoch
 * @param {number} params.endEpoch
 * @param {number} params.bucketSizeSeconds (e.g. 86400 = daily)
 */
export async function getTimePhasedAvailability (
  context,
  entityId,
  plantId,
  productId,
  vendorId,
  startEpoch,
  endEpoch
) {
  const client = await db.acquireClient()

  try {
    const periods = getNextPeriodsUTCCustom(startEpoch, 8, 12)
    console.log('periods: ', periods)

    // -----------------------
    // 1) Weeks
    // -----------------------

    const {
      inventoryAvailable,
      inventoryReserved,
      plannedSupply,
      plannedReserved,
      futureRequirements,
      productDetails

    } = await getMaterialAvailability(
      context,
      entityId,
      plantId,
      productId,
      vendorId,
      dateToUTCTimestamp(periods.weeks[0].startDay),
      dateToUTCTimestamp(periods.weeks[periods.weeks.length - 1].endDay) + 86399999, // end of day
      client
    )

    console.log('weeksData: ', JSON.stringify({
      inventoryAvailable,
      inventoryReserved,
      plannedSupply,
      plannedReserved,
      futureRequirements,
      productDetails

    }, null, 2))

    const weekBuckets = []

    for (const week of periods.weeks) {
      // getDateFromTimestamp

      const plannedSupplyBucket = plannedSupply
        .filter(r => getDateFromTimestamp(r.ts) >= week.startDay && getDateFromTimestamp(r.ts) <= week.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const plannedReservedBucket = plannedReserved
        .filter(r => getDateFromTimestamp(r.ts) >= week.startDay && getDateFromTimestamp(r.ts) <= week.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const inventoryReservedBucket = inventoryReserved
        .filter(r => getDateFromTimestamp(r.ts) >= week.startDay && getDateFromTimestamp(r.ts) <= week.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const availableStartBucket = inventoryAvailable

      const futureRequirementsBucket = futureRequirements
        .filter(r => getDateFromTimestamp(r.plannedStart) >= week.startDay && getDateFromTimestamp(r.plannedStart) <= week.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      // const availableS = available
      const availableEndBucket =
        inventoryAvailable +
        plannedSupplyBucket -
        plannedReservedBucket -
        inventoryReservedBucket

      weekBuckets.push({
        week: week.week,
        startDay: week.startDay,
        endDay: week.endDay,
        availableStartBucket,
        plannedSupplyBucket,
        plannedReservedBucket,
        inventoryReservedBucket,
        availableEndBucket,
        futureRequirementsBucket

      })
    }

    await db.commit(client)

    return {
      product: productDetails,
      from: getDateFromTimestamp(startEpoch),
      to: getDateFromTimestamp(endEpoch),
      weekBuckets
    }
  } catch (err) {
    log.error('Error in getTimePhasedAvailability:', err)
    await db.rollback(client)
    throw err
  } finally {
    db.releaseClient(client)
  }
}

/*

export async function getTimePhasedAvailability (
  context,
  entityId,
  plantId,
  productId,
  vendorId,
  startEpoch,
  endEpoch
) {
  const client = await db.acquireClient()

  console.log(getDaysBetweenTimestampsUTC(startEpoch, endEpoch))

  try {
    // -----------------------
    // 1) Initial on-hand
    // -----------------------
    const onHandRow = await db.row(
      `
      SELECT COALESCE(SUM(quantity),0)::numeric AS qty
      FROM interview.inventory_item
      WHERE product_id = $1
      AND vendor_id = $2
      AND entity_id = $3
      AND plant_id = $4
      `,
      [productId, vendorId, entityId, plantId],
      client
    )

    let available = parseFloat(onHandRow.qty || 0)

    // -----------------------
    // 2) Load all events upfront (MRP rule)
    // -----------------------

    const supplyRows = await db.query(
      `
      SELECT expected_at AS ts, quantity
      FROM interview.planned_supply
      WHERE product_id = $1
        AND vendor_id = $4
        AND expected_at BETWEEN $2 AND $3
        AND status IN ('PLANNED','CONFIRMED')
        AND entity_id = $5
        AND plant_id = $6
      `,
      [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
      client
    )

    const plannedResRows = await db.query(
      `
      SELECT pr.reserved_at AS ts, pr.quantity
      FROM interview.planned_reservation pr
      JOIN interview.planned_supply ps ON ps.id = pr.planned_supply_id
      WHERE ps.product_id = $1
        AND ps.vendor_id = $4
        AND ps.entity_id = $5
        AND ps.plant_id = $6
        AND pr.reserved_at BETWEEN $2 AND $3
        AND pr.status IN ('PLANNED','CONFIRMED')
      `,
      [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
      client
    )

    const invResRows = await db.query(
      `
      SELECT reserved_at AS ts, quantity
      FROM interview.inventory_reservation
      WHERE inventory_item_id IN (
        SELECT id FROM interview.inventory_item WHERE product_id = $1 AND vendor_id = $4 AND entity_id = $5 AND plant_id = $6
      )
        AND status = 'RESERVED'
        AND reserved_at BETWEEN $2 AND $3
        AND entity_id = $5
        AND plant_id = $6
      `,
      [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
      client
    )

    // -----------------------
    // 3) Bucketization (days)
    // -----------------------
    const dayBuckets = []

    const dayPeriods = getDaysBetweenTimestampsUTC(startEpoch, endEpoch)

    for (const period of dayPeriods) {
      // getDateFromTimestamp

      const incomingSupply = supplyRows
        .filter(r => getDateFromTimestamp(r.ts) === period)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const plannedReserved = plannedResRows
        .filter(r => getDateFromTimestamp(r.ts) === period)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const inventoryReserved = invResRows
        .filter(r => getDateFromTimestamp(r.ts) === period)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const availableStart = available
      available =
        availableStart +
        incomingSupply -
        plannedReserved -
        inventoryReserved

      dayBuckets.push({
        day: period,
        availableStart,
        incomingSupply,
        plannedReserved,
        inventoryReserved,
        availableEnd: available
      })
    }

    // -----------------------
    // 3) Bucketization (weeks)
    // -----------------------

    const weekBuckets = []

    const weekPeriods = getWeeksBetweenTimestampsUTC(startEpoch, endEpoch)

    for (const period of weekPeriods) {
      console.log('week period: ', period)
      // getDateFromTimestamp

      const incomingSupply = supplyRows
        .filter(r => getDateFromTimestamp(r.ts) > period.startDay && getDateFromTimestamp(r.ts) <= period.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const plannedReserved = plannedResRows
        .filter(r => getDateFromTimestamp(r.ts) > period.startDay && getDateFromTimestamp(r.ts) <= period.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const inventoryReserved = invResRows
        .filter(r => getDateFromTimestamp(r.ts) > period.startDay && getDateFromTimestamp(r.ts) <= period.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const availableStart = available
      available =
        availableStart +
        incomingSupply -
        plannedReserved -
        inventoryReserved

      weekBuckets.push({
        week: period,
        availableStart,
        incomingSupply,
        plannedReserved,
        inventoryReserved,
        availableEnd: available
      })
    }

    // -----------------------
    // 3) Bucketization (months)
    // -----------------------

    const monthBuckets = []

    const monthPeriods = getMonthsBetweenTimestampsUTC(startEpoch, endEpoch)

    for (const period of monthPeriods) {
      console.log('month period: ', period)
      // getDateFromTimestamp

      const incomingSupply = supplyRows
        .filter(r => getDateFromTimestamp(r.ts) > period.startDay && getDateFromTimestamp(r.ts) <= period.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const plannedReserved = plannedResRows
        .filter(r => getDateFromTimestamp(r.ts) > period.startDay && getDateFromTimestamp(r.ts) <= period.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const inventoryReserved = invResRows
        .filter(r => getDateFromTimestamp(r.ts) > period.startDay && getDateFromTimestamp(r.ts) <= period.endDay)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const availableStart = available
      available =
        availableStart +
        incomingSupply -
        plannedReserved -
        inventoryReserved

      monthBuckets.push({
        month: period,
        availableStart,
        incomingSupply,
        plannedReserved,
        inventoryReserved,
        availableEnd: available
      })
    }

    await db.commit(client)

    return {
      productId,
      vendorId,
      from: startEpoch,
      to: endEpoch,
      dayBuckets,
      weekBuckets
    }
  } catch (err) {
    log.error('Error in getTimePhasedAvailability:', err)
    await db.rollback(client)
    throw err
  } finally {
    db.releaseClient(client)
  }
}

export async function getTimePhasedAvailability (
  context,
  entityId,
  plantId,
  productId,
  vendorId,
  startEpoch,
  endEpoch,
  bucketSizeSeconds = 86400
) {
  const client = await db.acquireClient()

  console.log(getDaysBetweenTimestampsUTC(startEpoch, endEpoch))

  try {
    // -----------------------
    // 1) Initial on-hand
    // -----------------------
    const onHandRow = await db.row(
      `
      SELECT COALESCE(SUM(quantity),0)::numeric AS qty
      FROM interview.inventory_item
      WHERE product_id = $1
      AND vendor_id = $2
      AND entity_id = $3
      AND plant_id = $4
      `,
      [productId, vendorId, entityId, plantId],
      client
    )

    let available = parseFloat(onHandRow.qty || 0)

    // -----------------------
    // 2) Load all events upfront (MRP rule)
    // -----------------------

    const supplyRows = await db.query(
      `
      SELECT expected_at AS ts, quantity
      FROM interview.planned_supply
      WHERE product_id = $1
        AND vendor_id = $4
        AND expected_at BETWEEN $2 AND $3
        AND status IN ('PLANNED','CONFIRMED')
        AND entity_id = $5
        AND plant_id = $6
      `,
      [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
      client
    )

    const plannedResRows = await db.query(
      `
      SELECT pr.reserved_at AS ts, pr.quantity
      FROM interview.planned_reservation pr
      JOIN interview.planned_supply ps ON ps.id = pr.planned_supply_id
      WHERE ps.product_id = $1
        AND ps.vendor_id = $4
        AND ps.entity_id = $5
        AND ps.plant_id = $6
        AND pr.reserved_at BETWEEN $2 AND $3
        AND pr.status IN ('PLANNED','CONFIRMED')
      `,
      [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
      client
    )

    const invResRows = await db.query(
      `
      SELECT reserved_at AS ts, quantity
      FROM interview.inventory_reservation
      WHERE inventory_item_id IN (
        SELECT id FROM interview.inventory_item WHERE product_id = $1 AND vendor_id = $4 AND entity_id = $5 AND plant_id = $6
      )
        AND status = 'RESERVED'
        AND reserved_at BETWEEN $2 AND $3
        AND entity_id = $5
        AND plant_id = $6
      `,
      [productId, startEpoch, endEpoch, vendorId, entityId, plantId],
      client
    )

    // -----------------------
    // 3) Bucketization
    // -----------------------
    const buckets = []

    for (
      let from = startEpoch;
      from < endEpoch;
      from += bucketSizeSeconds
    ) {
      const to = Math.min(from + bucketSizeSeconds, endEpoch)

      const incomingSupply = supplyRows
        .filter(r => r.ts >= from && r.ts < to)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const plannedReserved = plannedResRows
        .filter(r => r.ts >= from && r.ts < to)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const inventoryReserved = invResRows
        .filter(r => r.ts >= from && r.ts < to)
        .reduce((s, r) => s + parseFloat(r.quantity), 0)

      const availableStart = available
      available =
        availableStart +
        incomingSupply -
        plannedReserved -
        inventoryReserved

      buckets.push({
        from,
        to,
        availableStart,
        incomingSupply,
        plannedReserved,
        inventoryReserved,
        availableEnd: available
      })
    }

    await db.commit(client)

    return {
      productId,
      vendorId,
      startEpoch,
      endEpoch,
      buckets
    }
  } catch (err) {
    log.error('Error in getTimePhasedAvailability:', err)
    await db.rollback(client)
    throw err
  } finally {
    db.releaseClient(client)
  }
}
*/

// ------------------------------------------------------------
// FEFO selection
// ------------------------------------------------------------

// TODO maybe we just may call plannedReservationRepository.findByProduct
export async function _selectPlannedFAFO (context, entityId, plantId, productId, vendorId, client = null) {
  const query = `
    SELECT 
      pr.id,
      pr.batch_id,
      bat.code as batch_code,
      ps.id as planned_supply_id,
      ps.product_id,
      prd.code as product_code,
      prd.name as product_name,
      ps.vendor_id,
      ven.code as vendor_code,
      ven.name as vendor_name,
      pr.reserved_quantity,
      ps.quantity,
      pr.unit_of_measure_id,
      uom.code as unit_of_measure_code,
      uom.name as unit_of_measure_name,
      pr.reserved_at,
      pr.reserved_by,
      us1.full_name as reserved_by_name,
      pr.status,
      ps.source_type,
      ps.source_code,
      ps.expected_at
     FROM interview.planned_supply ps
     -- LEFT JOIN interview.planned_reservation pr ON (pr.planned_supply_id = ps.id)
     INNER JOIN interview.product prd ON (ps.product_id = prd.id)
     INNER JOIN interview.vendor ven ON (ps.vendor_id = ven.id)
     LEFT JOIN interview.batch bat ON (pr.batch_id = bat.id)
     LEFT JOIN interview.unit_of_measure uom ON (prd.unit_of_measure_id = uom.id)
     LEFT JOIN auth.user us1 ON (pr.reserved_by = us1.id)
     LEFT JOIN (
          SELECT inventory_item_id, SUM(quantity) as reserved_quantity
          FROM interview.inventory_reservation
          WHERE status = 'RESERVED'
          GROUP BY inventory_item_id
     ) pr ON ON (pr.planned_supply_id = ps.id)
     WHERE ps.product_id = $1
       AND ps.vendor_id = $2
       AND ps.entity_id = $3
       AND ps.plant_id = $4
       AND ven.entity_id = $3
       AND ven.plant_id = $4
       AND (pr.entity_id = $3 OR pr.entity_id IS NULL)
       AND (pr.plant_id = $4 OR pr.plant_id IS NULL)
       AND (bat.entity_id = $3 OR bat.entity_id IS NULL)
       AND (bat.plant_id = $4 OR bat.plant_id IS NULL)
       AND (us1.entity_id = $3 OR us1.entity_id IS NULL)
     ORDER BY ps.expected_at ASC, pr.reserved_at DESC`

  const bind = [productId, vendorId, entityId, plantId]
  // const bind = [productId, vendorId]

  const response = await db.query(query, bind, client)
  return response
}

// First Arrives First Out
async function selectPlannedFAFO ({ context, entityId, plantId, productId, vendorId, requiredQuantity }) {
  const client = await db.acquireClient()
  try {
    const plannedLots = await plannedSupplyRepository.findByProduct(context, entityId, plantId, productId, vendorId, client)
    console.log('plannedLots _selectPlannedFAFO: ', plannedLots)

    let remaining = parseFloat(requiredQuantity)
    const picks = []

    for (const lot of plannedLots) {
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

export const planningService = {
  getProductAvailabilityAtDate,
  getTimePhasedAvailability
}

// import { plannedSupplyRepository } from '../repositories/plannedSupply.js'
// import { plannedReservationRepository } from '../repositories/plannedReservation.js'
// import { billOfMaterialsRepository } from '../repositories/billOfMaterials.js'
// import { timestamp } from '../utils/index.js'

// // src/services/mrpInventoryService.js
// import { pool } from '../db/pool.js'

// /**
//  * Explode BOM (1-level). If you need recursive explosion, extend this function.
//  * Returns array of { material_id, quantity_per_unit, uom_id }
//  */
// export async function explodeBom (productId) {
//   // Example: reuse your BOM repo (implement properly)
//   const rows = await billOfMaterialsRepository.getBomItems(productId)
//   // Map to normalized structure
//   return rows.map(r => ({
//     material_id: r.component_id,
//     quantity_per_unit: parseFloat(r.quantity),
//     unit_id: r.unit_of_measure_id
//   }))
// }

// /**
//  * Run a simple MRP for a list of planned work orders.
//  * workOrders: [{ id, product_id, required_date (epoch), quantity, unit_id, created_by }]
//  *
//  * Strategy:
//  *  - For each work order, explode BOM to get material requirements
//  *  - For each material req: compute available (= onhand + confirmed planned supply before required_date - already allocated planned supply)
//  *  - If shortage: allocate from planned_supply (ordered by expected_date asc) by creating mrp_reservation rows
//  */
// export async function runPlanningForWorkOrders (context, entityId, plantId, workOrders) {
//   const client = await db.acquireClient()

//   try {
//     await db.begin(client)

//     const createdBy = context.session.userId
//     const results = []

//     for (const wo of workOrders) {
//       // explode bom
//       const bomItems = await explodeBom(wo.product_id)
//       const woResult = { workOrderId: wo.id, allocations: [] }

//       for (const bi of bomItems) {
//         // required total = quantity_per_unit * wo.quantity
//         const requiredQty = bi.quantity_per_unit * parseFloat(wo.quantity)

//         // Step: compute on-hand
//         const onHand = await getOnHand(bi.material_id)

//         // Step: compute confirmed planned supply (supply expected <= required_date)
//         const plannedSupplies = await plannedSupplyRepository.getPlannedSupplyByProduct(bi.material_id, wo.required_date)

//         // Compute already allocated planned supply to other MRP reservations (PLANNED or CONFIRMED)
//         const { rows: allocatedRows } = await db.row(
//           `SELECT COALESCE(SUM(reserved_quantity),0)::numeric AS allocated
//            FROM interview.mrp_reservation mr
//            JOIN interview.planned_supply ps ON ps.id = mr.planned_supply_id
//            WHERE ps.product_id = $1 AND mr.status IN ('PLANNED','CONFIRMED')`,
//           [bi.material_id]
//         )
//         const alreadyAllocated = parseFloat(allocatedRows[0].allocated || 0)

//         // available from onhand and already-confirmed supply
//         // (note: onHand is real stock; planned supply we will use next)
//         let remaining = requiredQty - onHand
//         if (remaining <= 0) {
//           // no need to allocate planned supply
//           continue
//         }

//         // subtract any planned supply that is already allocated to others but also expected earlier
//         // we will attempt to allocate from plannedSupplies list in order of expected_date
//         for (const ps of plannedSupplies) {
//           if (remaining <= 0) break
//           // compute how much of this planned supply is still available (ps.quantity minus sum of mrp_reservations on it)
//           const { rows: usedRows } = await db.row(
//             `SELECT COALESCE(SUM(reserved_quantity),0)::numeric AS used
//              FROM interview.mrp_reservation
//              WHERE planned_supply_id = $1 AND status IN ('PLANNED','CONFIRMED')`,
//             [ps.id]
//           )
//           const used = parseFloat(usedRows[0].used || 0)
//           const availableOnPs = parseFloat(ps.quantity) - used
//           if (availableOnPs <= 0) continue
//           const toReserve = Math.min(availableOnPs, remaining)

//           // create mrp_reservation and reduce planned_supply.quantity
//           const reservation = await plannedReservationRepository.createPlannedReservation(context, entityId, plantId, {
//             workOrderId: wo.id,
//             plannedSupplyId: ps.id,
//             reservedQuantity: toReserve,
//             unitId: bi.unit_id,
//             reservedBy: createdBy
//           }, client)

//           // optionally, immediately decrement planned_supply.quantity (we keep it to reflect remaining)
//           await plannedSupplyRepository.reducePlannedSupply(ps.id, toReserve, client)

//           woResult.allocations.push({
//             materialId: bi.material_id,
//             plannedSupplyId: ps.id,
//             reservedQuantity: toReserve,
//             reservationId: reservation.id,
//             expectedDate: ps.expected_date
//           })

//           remaining -= toReserve
//         }

//         if (remaining > 0) {
//           // shortage — report it
//           woResult.allocations.push({
//             materialId: bi.material_id,
//             shortage: remaining
//           })
//         }
//       } // end for each BOM item

//       results.push(woResult)
//     } // end for each work order

//     await db.commit(client)
//     return results
//   } catch (err) {
//     await db.rollback(client)
//     throw err
//   } finally {
//     await db.releaseClient(client)
//   }
// }

// export async function clearPlannedReservationsForWorkOrder (context, entityId, plantId, workOrderId, client = null) {
//   const response = await db.query(
//     `DELETE FROM interview.planned_reservation
//      WHERE work_order_id = $1
//        AND entity_id = $2
//        AND plant_id = $3`,
//     [workOrderId, entityId, plantId],
//     client
//   )
//   return response
// }

// export async function migrateReservationFromPlannedToInventory (context, entityId, plantId, client = null) {
//   const response = await db.query(`
//     INSERT INTO interview.inventory_reservation (
//         id,
//         inventory_item_id,
//         batch_id,
//         quantity,
//         status
//         )
//     SELECT
//         gen_random_uuid(),
//         ii.id,
//         mr.batch_id,
//         mr.quantity,
//         'RESERVED'
//         FROM interview.mrp_reservation mr
//         JOIN interview.inventory_item ii
//         ON ii.planned_supply_id = mr.planned_supply_id
//         WHERE mr.planned_supply_id = :planned_supply_id
//         AND mr.status = 'CONFIRMED';
//         `, [entityId, plantId], client)

//   return response
// }

// /**
//  * Get on-hand total for a product (sum of inventory_item.quantity)
//  */
// export async function getOnHand (productId, asOfEpoch = Number.MAX_SAFE_INTEGER) {
//   const response = await db.row(
//     `SELECT COALESCE(SUM(quantity),0)::numeric AS onhand
//      FROM interview.inventory_item
//      WHERE product_id = $1`,
//     [productId]
//   )
//   return parseFloat(response.onhand || 0)
// }

// /*
// Addendum — Location-aware and available quantity

// If you want available (on-hand minus reserved) as of a date and optionally per location:

// Compute onhand = getOnHandHistorical(productId, asOfEpoch) (optionally filter by location)

// Compute reserved = SUM(reserved_quantity) FROM inventory_reservation WHERE status = 'RESERVED' AND created_at <= asOfEpoch (and optionally batch/reservation date logic)

// available = onhand - reserved

// Be careful with reservations created after asOfEpoch — they shouldn't affect historical availability.

// on_hand(as_of = T)
// = initial stock
// + receipts ≤ T
// − issues ≤ T
// ± adjustments ≤ T
// − reservations active at T
// */
// export async function getOnHandHistorical (productId, asOfEpoch = timestamp()) {
//   const response = await db.row(
//     `SELECT COALESCE(SUM(net_qty),0)::numeric AS onhand
//      FROM (
//        SELECT
//          CASE
//            WHEN im.movement_type = 'ISSUE' THEN -im.quantity
//            WHEN im.movement_type IN ('RECEIPT','RETURN') THEN im.quantity
//            WHEN im.movement_type = 'ADJUSTMENT' THEN im.quantity  -- may be negative or positive
//            ELSE 0 -- ignore TRANSFER for global on-hand
//          END AS net_qty
//        FROM interview.inventory_movement im
//        JOIN interview.inventory_item ii ON ii.id = im.inventory_item_id
//        WHERE ii.product_id = $1
//          AND im.created_at <= $2
//      ) t;`,
//     [productId, asOfEpoch]
//   )

//   return parseFloat(response.onhand || 0)
// }

// /**
//  * getAvailableOnDate
//  *
//  * Calculates available inventory for MRP as of a given timestamp.
//  *
//  * @param {UUID} productId
//  * @param {number} asOfEpoch - Unix timestamp (seconds)
//  * @returns {number} available quantity
//  */
// export async function getAvailableOnDate (productId, asOfEpoch) {
//   const client = await pool.connect()
//   try {
//     /* ---------------------------
//      * 1) On-hand as of date
//      * ---------------------------
//      * Derived from inventory movements
//      */
//     const onHandRows = await db.row(
//       `
//       SELECT COALESCE(SUM(
//         CASE movement_type
//           WHEN 'RECEIPT'    THEN quantity
//           WHEN 'ISSUE'      THEN -quantity
//           WHEN 'ADJUSTMENT' THEN quantity
//           ELSE 0
//         END
//       ), 0)::numeric AS onhand
//       FROM interview.inventory_movement im
//       JOIN interview.inventory_item ii ON ii.id = im.inventory_item_id
//       WHERE ii.product_id = $1
//         AND im.created_at <= $2
//       `,
//       [productId, asOfEpoch]
//     )

//     const onHand = parseFloat(onHandRows.onhand || 0)

//     /* ---------------------------
//      * 2) Active reservations at date
//      * ---------------------------
//      */
//     const reservationRows = await db.row(
//       `
//       SELECT COALESCE(SUM(ir.quantity), 0)::numeric AS reserved
//       FROM interview.inventory_reservation ir
//       JOIN interview.inventory_item ii ON ii.id = ir.inventory_item_id
//       WHERE ii.product_id = $1
//         AND ir.status = 'RESERVED'
//         AND ir.reserved_at <= $2
//         AND (
//           ir.released_at IS NULL
//           OR ir.released_at > $2
//         )
//       `,
//       [productId, asOfEpoch]
//     )

//     const reserved = parseFloat(reservationRows.reserved || 0)

//     /* ---------------------------
//      * 3) Available = On-hand − Reserved
//      * ---------------------------
//      */
//     return onHand - reserved
//   } finally {
//     client.release()
//   }
// }
