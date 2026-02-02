# MES Factory System - Development Guide

## Table of Contents

1. [Overview](#overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Architecture Quick Reference](#architecture-quick-reference)
4. [Backend Development](#backend-development)
   - [Creating API Endpoints](#creating-api-endpoints)
   - [Working with Repositories](#working-with-repositories)
   - [Working with Services](#working-with-services)
   - [Database Queries](#database-queries)
   - [Error Handling](#error-handling)
5. [Frontend Development](#frontend-development)
   - [Creating Views](#creating-views)
   - [Using Components](#using-components)
   - [Calling Backend APIs](#calling-backend-apis)
   - [Routing](#routing)
6. [Database Development](#database-development)
7. [Testing](#testing)
8. [Code Style Guide](#code-style-guide)

---

## Overview

This is a full-stack Node.js application with a custom RPC-based architecture:

- **Backend**: Express.js server with PostgreSQL database
- **Frontend**: Vanilla JavaScript SPA with custom routing
- **API Pattern**: RPC-based communication using `backendRpc()`
- **Data Access**: Repository pattern with Result monad
- **Multi-tenant**: Entity and Plant scoping

---

## Development Environment Setup

### Prerequisites

- Node.js 20+ (required for `--env-file` flag)
- PostgreSQL 14+
- Git

### Initial Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd mes
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   CONFIG_DEBUG=true
   CONFIG_BACKEND_URL=http://localhost:3000
   DB_URL=postgresql://user:password@localhost:5432/mes_db
   SERVER_PORT=3000
   ```

3. **Setup database**:
   ```bash
   # Run migrations
   node --env-file=.env server/migrations/index.js up
   
   # Or use the deployment script
   bash scripts/dbdeploy.sh
   ```

4. **Start development server**:
   ```bash
   npm run dev  # Auto-restarts on file changes
   ```

5. **Access the application**:
   - Main app: http://localhost:3000/main
   - Backoffice: http://localhost:3000/backoffice

---

## Architecture Quick Reference

### RPC Communication Flow

```
Frontend                    Backend
--------                    -------
backendRpc(                 server/api/
  'app/module',      ───►     {app}/
  'functionName',               {module}/
  {...args}                       api.js
)                                   └─► export async function functionName(args, context)
```

### Directory Structure

```
server/
├── api/              # API endpoints (RPC handlers)
│   └── app/
│       ├── auth/
│       │   └── public/  # Public endpoints (no auth)
│       │       └── api.js
│       ├── masterdata/
│       │   ├── vendor/
│       │   │   └── api.js
│       │   └── product/
│       │       └── api.js
│       └── ...
├── repositories/     # Data access layer
├── services/         # Business logic layer
├── web/             # Express routing & middleware
└── utils/           # Utility functions

public/
├── apps/
│   ├── main/        # Main application
│   │   ├── index.html
│   │   ├── index.js
│   │   └── views/   # View components
│   │       ├── customers/
│   │       │   ├── index.html
│   │       │   └── index.js
│   │       └── ...
│   └── backoffice/  # Backoffice application
├── components/      # Reusable UI components
├── js/             # Shared JavaScript utilities
└── css/            # Styles
```

---

## Backend Development

### Creating API Endpoints

API endpoints are exported functions in `api.js` files that handle RPC requests.

#### Step-by-Step: Create a New API Endpoint

**1. Choose the right location**:
   - Public endpoints (no auth): `server/api/app/{domain}/public/api.js`
   - Protected endpoints: `server/api/app/{domain}/{module}/api.js`

**2. Create the file structure**:
   ```bash
   mkdir -p server/api/app/masterdata/vendor
   touch server/api/app/masterdata/vendor/api.js
   ```

**3. Implement endpoint functions**:

```javascript
// server/api/app/masterdata/vendor/api.js
import { ApiResponseOk, ApiResponseError } from '../../../../utils/response.js'
import { vendorRepository } from '../../../../repositories/vendor.js'
import { uuid } from '../../../../utils/index.js'

/**
 * List vendors with pagination
 * Called from frontend: backendRpc('app/masterdata/vendor', 'list', {...})
 */
export async function list (args, context) {
  // Extract session data (automatically populated for authenticated requests)
  const { entityId, plantId } = context.session

  // Extract and provide defaults for arguments
  const {
    search = '%',
    orderCol = 1,
    orderDir = 'asc',
    page = 1,
    size = 10
  } = args

  // Call repository
  const response = await vendorRepository.tablePaginated(
    context,
    entityId,
    plantId,
    search,
    orderCol,
    orderDir,
    page,
    size
  )

  return ApiResponseOk(response)
}

/**
 * Get vendor by ID
 */
export async function findById (args, context) {
  const { entityId, plantId } = context.session
  const { vendorId } = args

  const response = await vendorRepository.findById(
    context,
    entityId,
    plantId,
    vendorId
  )

  return ApiResponseOk(response)
}

/**
 * Create or update vendor
 */
export async function save (args, context) {
  const { entityId, plantId } = context.session
  const { vendorId, vendorName, vendorCode, vendorEmail } = args

  if (vendorId) {
    // Update existing
    const response = await vendorRepository.update(
      context,
      entityId,
      plantId,
      vendorId,
      vendorName,
      vendorCode,
      vendorEmail
    )
    return ApiResponseOk(response)
  } else {
    // Create new
    const response = await vendorRepository.create(
      context,
      entityId,
      plantId,
      uuid(),
      vendorName,
      vendorCode,
      vendorEmail
    )
    return ApiResponseOk(response)
  }
}

/**
 * Delete vendor
 */
export async function remove (args, context) {
  const { entityId, plantId } = context.session
  const { vendorId } = args

  const response = await vendorRepository.deleteById(
    context,
    entityId,
    plantId,
    vendorId
  )

  return ApiResponseOk(response)
}
```

**4. Context object structure**:

The `context` parameter contains:
```javascript
{
  session: {
    entityId: '...',      // Current tenant entity
    plantId: '...',       // Current plant
    userId: '...',        // Authenticated user ID
    userName: '...',      // User full name
    userEmail: '...',     // User email
    userIsAdmin: false,   // Admin flag
    permissions: [...],   // User permissions
    roles: [...]          // User roles
  },
  ip: '127.0.0.1',       // Client IP
  userAgent: '...',       // Browser user agent
  now: 1706140800000,     // Current timestamp
  config: {...},          // App configuration
  execId: '...',          // Unique execution ID
  token: '...'            // Session token
}
```

#### Response Helpers

Always use these helpers from `server/utils/response.js`:

```javascript
// Success response
ApiResponseOk(data, message = 'ok')
// Returns: { error: false, code: 1000, data: {...}, message: 'ok' }

// Error response
ApiResponseError(code, message)
// Returns: { error: true, code: 1040, data: null, message: '...' }

// Result monad response (recommended)
ApiResponseResult(result, errorCode)
// If result.isError(): { error: true, code: errorCode, data: null, message: result.error }
// If result.isOk(): { error: false, code: 1000, data: result.value, message: 'ok' }

// Not authorized
ApiResponseNotAuthorized()
// Returns: { error: true, code: 1002, data: null, message: 'Not authorized' }
```

#### Error Codes Reference

| Code | Meaning |
|------|---------|
| 1000 | Success |
| 1002 | Not authorized / Invalid session |
| 1012 | Timeout |
| 1040 | Input validation error |
| 1100 | Server error / Output validation error |
| 1500 | Permission denied |
| 2000+ | Domain-specific errors |

---

### Working with Repositories

Repositories handle data access and abstract database operations.

#### Step-by-Step: Create a Repository

**1. Create repository file**:
```bash
touch server/repositories/vendor.js
```

**2. Implement repository**:

```javascript
// server/repositories/vendor.js
import { db } from '../platform/db/index.js'
import { createBaseRepository } from './base.js'

const TABLE_NAME = 'masterdata.vendor'

// Get base CRUD operations
const base = createBaseRepository(TABLE_NAME)

/**
 * Find vendor by ID
 * @param {Object} context - Application context
 * @param {string} entityId - Entity ID (tenant)
 * @param {string} plantId - Plant ID
 * @param {string} vendorId - Vendor ID
 * @param {Object} client - Database client (optional, for transactions)
 * @returns {Promise<Object|null>} Vendor data or null
 */
const findById = async (context, entityId, plantId, vendorId, client = null) => {
  const query = `
    SELECT 
      ven.id,
      ven.code,
      ven.name,
      ven.email,
      ven.created_at,
      us1.full_name as created_by,
      ven.updated_at,
      us2.full_name as updated_by
    FROM masterdata.vendor ven
    INNER JOIN auth.user us1 ON (ven.created_by = us1.id)
    LEFT JOIN auth.user us2 ON (ven.updated_by = us2.id)
    WHERE 1=1
      AND ven.id = $1
      AND ven.entity_id = $2
      AND ven.plant_id = $3
      AND us1.entity_id = $2
      AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
    LIMIT 1
  `

  const bind = [vendorId, entityId, plantId]
  const response = await db.row(query, bind, client)

  return response
}

/**
 * Find all vendors (for dropdowns, etc.)
 */
const findAll = async (context, entityId, plantId, client = null) => {
  const query = `
    SELECT 
      id,
      code,
      name,
      email
    FROM masterdata.vendor
    WHERE entity_id = $1
      AND plant_id = $2
    ORDER BY name ASC
  `

  const bind = [entityId, plantId]
  return await db.query(query, bind, client)
}

/**
 * Paginated list for DataTable component
 */
const tablePaginated = async (
  context,
  entityId,
  plantId,
  search,
  orderCol,
  orderDir,
  page,
  size,
  client = null
) => {
  const offset = (page - 1) * size

  const query = `
    SELECT 
      ven.id,
      ven.code,
      ven.name,
      ven.email,
      ven.created_at,
      us1.full_name as created_by
    FROM masterdata.vendor ven
    INNER JOIN auth.user us1 ON (ven.created_by = us1.id)
    WHERE ven.entity_id = $1
      AND ven.plant_id = $2
      AND (
        ven.name ILIKE $3
        OR ven.code ILIKE $3
        OR ven.email ILIKE $3
      )
      AND us1.entity_id = $1
    ORDER BY ${orderCol} ${orderDir}
    LIMIT $4 OFFSET $5
  `

  const bind = [entityId, plantId, search, size, offset]
  const rows = await db.query(query, bind, client)

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM masterdata.vendor ven
    WHERE ven.entity_id = $1
      AND ven.plant_id = $2
      AND (
        ven.name ILIKE $3
        OR ven.code ILIKE $3
        OR ven.email ILIKE $3
      )
  `

  const countResult = await db.row(countQuery, [entityId, plantId, search], client)

  return {
    rows,
    total: parseInt(countResult?.total || 0),
    page,
    size
  }
}

/**
 * Create new vendor
 */
const create = async (
  context,
  entityId,
  plantId,
  id,
  name,
  code,
  email,
  client = null
) => {
  const query = `
    INSERT INTO masterdata.vendor (
      id,
      entity_id,
      plant_id,
      code,
      name,
      email,
      created_by,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `

  const bind = [
    id,
    entityId,
    plantId,
    code,
    name,
    email,
    context.session.userId,
    context.now
  ]

  return await db.row(query, bind, client)
}

/**
 * Update vendor
 */
const update = async (
  context,
  entityId,
  plantId,
  id,
  name,
  code,
  email,
  client = null
) => {
  const query = `
    UPDATE masterdata.vendor
    SET 
      name = $1,
      code = $2,
      email = $3,
      updated_by = $4,
      updated_at = $5
    WHERE id = $6
      AND entity_id = $7
      AND plant_id = $8
    RETURNING *
  `

  const bind = [
    name,
    code,
    email,
    context.session.userId,
    context.now,
    id,
    entityId,
    plantId
  ]

  return await db.row(query, bind, client)
}

/**
 * Delete vendor
 */
const deleteById = async (context, entityId, plantId, id, client = null) => {
  const query = `
    DELETE FROM masterdata.vendor
    WHERE id = $1
      AND entity_id = $2
      AND plant_id = $3
    RETURNING id
  `

  const bind = [id, entityId, plantId]
  return await db.row(query, bind, client)
}

export const vendorRepository = {
  ...base,
  findById,
  findAll,
  tablePaginated,
  create,
  update,
  deleteById
}
```

#### Base Repository Methods

When you use `createBaseRepository(tableName)`, you get these methods for free:

```javascript
// Find all records
findAll(client)

// Find by ID (simple)
findById(id, client)

// Create record
create(data, client)

// Update record
update(id, data, client)

// Delete record
delete(id, client)

// Find with conditions
find(conditions, client)
```

#### Query Builder Operators

```javascript
// Equality
{ name: 'John' }  // name = 'John'

// Comparison operators
{ age: { $gt: 25 } }      // age > 25
{ age: { $gte: 25 } }     // age >= 25
{ age: { $lt: 30 } }      // age < 30
{ age: { $lte: 30 } }     // age <= 30
{ age: { $ne: 25 } }      // age != 25

// String matching
{ name: { $like: '%John%' } }     // name LIKE '%John%'
{ name: { $ilike: '%john%' } }    // name ILIKE '%john%' (case-insensitive)

// IN operator
{ status: { $in: ['ACTIVE', 'PENDING'] } }  // status IN ('ACTIVE', 'PENDING')

// IS NULL / IS NOT NULL
{ deleted_at: { $is: null } }      // deleted_at IS NULL
{ deleted_at: { $isnot: null } }   // deleted_at IS NOT NULL

// Custom SQL expressions
{ 
  email: { 
    $expr: 'LOWER(email) = LOWER($1)', 
    values: ['test@example.com'] 
  } 
}
```

#### Database Client Methods

```javascript
// Query (returns array of rows)
const rows = await db.query(query, bind, client)

// Row (returns single object or null)
const row = await db.row(query, bind, client)

// Value (returns single value or null)
const count = await db.value(query, bind, client)

// Transaction support
const client = await db.acquireClient()
try {
  await db.query('BEGIN', [], client)
  // ... queries ...
  await db.commit(client)
} catch (err) {
  await db.rollback(client)
  throw err
} finally {
  await db.releaseClient(client)
}
```

---

### Working with Services

Services contain business logic and orchestrate multiple repositories.

#### Step-by-Step: Create a Service

**1. Create service file**:
```bash
touch server/services/planning.js
```

**2. Implement service**:

```javascript
// server/services/planning.js
import { db } from '../platform/db/index.js'
import log from '../platform/log.js'

/**
 * Calculate product availability at a specific date
 * Combines on-hand inventory, reservations, and planned supply
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
    await db.query('BEGIN', [], client)

    // 1) On-hand inventory
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

    // 2) Inventory reservations (physical)
    const invResRow = await db.row(
      `
      SELECT COALESCE(SUM(quantity), 0)::numeric AS qty
      FROM interview.inventory_reservation
      WHERE inventory_item_id IN (
        SELECT id 
        FROM interview.inventory_item 
        WHERE product_id = $1
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

    // 3) Planned supply
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

    // 4) Planned reservations (MRP allocations)
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

    // Final calculation
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
```

**3. Use service from API endpoint**:

```javascript
// server/api/app/material_planning/availability/api.js
import { ApiResponseOk, ApiResponseError } from '../../../../utils/response.js'
import { getProductAvailabilityAtDate } from '../../../../services/planning.js'

export async function checkAvailability (args, context) {
  const { entityId, plantId } = context.session
  const { productId, vendorId, asOfDate } = args

  try {
    const result = await getProductAvailabilityAtDate({
      entityId,
      plantId,
      productId,
      vendorId,
      asOfEpoch: asOfDate
    })

    return ApiResponseOk(result)
  } catch (error) {
    return ApiResponseError(1100, error.message)
  }
}
```

---

### Database Queries

#### Best Practices

1. **Always use parameterized queries** (prevent SQL injection):
   ```javascript
   // ✅ GOOD
   const query = 'SELECT * FROM users WHERE id = $1'
   const result = await db.query(query, [userId])

   // ❌ BAD - SQL INJECTION RISK!
   const query = `SELECT * FROM users WHERE id = '${userId}'`
   ```

2. **Use table aliases** (first 3 characters + number if needed):
   ```javascript
   const query = `
     SELECT 
       ven1.name as vendor_name,
       ven2.name as supplier_name
     FROM masterdata.vendor ven1
     LEFT JOIN masterdata.vendor ven2 ON ven1.supplier_id = ven2.id
   `
   ```

3. **Always include entity and plant filtering**:
   ```javascript
   WHERE 
     ven.entity_id = $1
     AND ven.plant_id = $2
   ```

4. **Use snake_case for database columns, camelCase in JavaScript**:
   ```javascript
   // Database: created_at, updated_by
   // JavaScript: createdAt, updatedBy
   // (Auto-converted via keysToCamel from utils)
   ```

5. **Prefer repositories over raw SQL**:
   ```javascript
   // ✅ PREFERRED
   const vendor = await vendorRepository.findById(context, entityId, plantId, vendorId)

   // ⚠️ Use only when repository doesn't cover your needs
   const vendor = await db.row('SELECT * FROM vendor WHERE id = $1', [vendorId])
   ```

---

### Error Handling

#### Using Result Monad (Recommended)

```javascript
import { Result } from '../utils/result.js'

// In repository or service
const findUser = async (email) => {
  try {
    const user = await db.row('SELECT * FROM users WHERE email = $1', [email])
    
    if (!user) {
      return Result.fail('User not found')
    }
    
    return Result.ok(user)
  } catch (error) {
    return Result.fail(error.message)
  }
}

// In API endpoint
export async function getUser (args, context) {
  const result = await findUser(args.email)
  
  // Automatically handles success/error
  return ApiResponseResult(result, 2001)
  // If error: { error: true, code: 2001, message: 'User not found' }
  // If success: { error: false, code: 1000, data: {...} }
}
```

#### Result Monad Methods

```javascript
// Create success result
const result = Result.ok({ id: 1, name: 'John' })

// Create failure result
const result = Result.fail('Something went wrong')

// Check result
if (result.isOk()) {
  console.log(result.value)  // Access value
}

if (result.isError()) {
  console.log(result.error)  // Access error
}

// Merge multiple results
const result = Result.merge(result1, result2, result3)
// Returns first error or array of all values

// Select based on condition
const result = Result.select(hasError, value, errorMessage)
```

---

## Frontend Development

### Creating Views

Views are SPA pages that get loaded dynamically by the router.

#### Step-by-Step: Create a New View

**1. Choose your app and route**:
   - App: `main` or `backoffice`
   - Route: e.g., `/vendors` → view ID: `view_vendors`

**2. Create view directory**:
   ```bash
   mkdir -p public/apps/main/views/vendors
   touch public/apps/main/views/vendors/index.html
   touch public/apps/main/views/vendors/index.js
   ```

**3. Create HTML template** (`index.html`):

```html
<!-- public/apps/main/views/vendors/index.html -->
<div aria-label="breadcrumb">
  <ol class="breadcrumb">
    <li class="breadcrumb-item">
      <a href="/masterdata" router-link>Master Data</a>
    </li>
    <li class="breadcrumb-item active" aria-current="page">
      Vendors
    </li>
  </ol>
</div>

<div class="container-xl">
  <div class="p-3 border">
    <div class="vstack">
      <!-- Search and actions -->
      <div class="hstack flex-align-center mb-3">
        <forms-search 
          id="vendors__search" 
          placeholder="Search vendors..." 
          width="100%">
        </forms-search>
        <a href="/vendors/create" class="button primary" router-link>
          New Vendor
        </a>
      </div>

      <!-- Data table -->
      <div id="vendors__table"></div>
    </div>
  </div>
</div>
```

**4. Create JavaScript logic** (`index.js`):

```javascript
// public/apps/main/views/vendors/index.js
import { log } from '../../js/log.js'
import { $ } from '../../js/dom.js'
import { eventsListen } from '../../js/events.js'
import { i18nUnixToDate } from '../../js/i18n.js'
import { DataTable } from '../../components/Tables/DataTable.js'

const logContext = 'VIEWS:VENDORS:LIST'

// Initialize DataTable
const table = DataTable({
  target: '#vendors__table',
  params: ['app/masterdata/vendor', 'list'],  // RPC endpoint
  options: {
    title: 'Vendors',
    orderCol: 'name',
    orderDir: 'asc'
  },
  columns: {
    id: {
      visible: false
    },
    code: {
      visible: true,
      header: 'Code',
      sortable: true,
      align: 'left'
    },
    name: {
      visible: true,
      header: 'Name',
      sortable: true,
      align: 'left',
      transform: (value, row) => {
        return `<strong>${value}</strong>`
      }
    },
    email: {
      visible: true,
      header: 'Email',
      sortable: true,
      align: 'left'
    },
    createdAt: {
      visible: true,
      header: 'Created',
      sortable: true,
      align: 'right',
      transform: (value) => i18nUnixToDate(value)
    },
    createdBy: {
      visible: true,
      header: 'Created By',
      sortable: false,
      align: 'right'
    },
    actions: {
      visible: true,
      header: 'Actions',
      sortable: false,
      align: 'center',
      transform: (_value, row) => {
        return `
          <a href="/vendors/edit?id=[id]" 
             class="button link" 
             router-link>
            <img src="/images/icons/edit-square.svg" alt="Edit" />
          </a>
        `
      }
    }
  }
})

/**
 * Called when view is shown
 * @param {Object} params - URL query parameters as object
 */
export async function show (params) {
  log('View shown', logContext)

  // Reload table if requested
  if (params.reload === 'true') {
    table.reload()
  }

  // Setup search
  $('#vendors__search').addEventListener('input', (event) => {
    table.search(event.target.value)
  })
}

/**
 * Called when view is hidden (optional)
 */
export async function hide () {
  log('View hidden', logContext)
  // Cleanup if needed
}

// Listen for data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'vendors') {
    table.reload()
  }
})
```

**5. Create form view** (for editing):

```html
<!-- public/apps/main/views/vendors/edit/index.html -->
<div aria-label="breadcrumb">
  <ol class="breadcrumb">
    <li class="breadcrumb-item">
      <a href="/masterdata" router-link>Master Data</a>
    </li>
    <li class="breadcrumb-item">
      <a href="/vendors" router-link>Vendors</a>
    </li>
    <li class="breadcrumb-item active" aria-current="page">
      Edit Vendor
    </li>
  </ol>
</div>

<div class="container-xl">
  <div class="p-3 border">
    <form id="vendor-form">
      <input type="hidden" id="vendor-id" name="vendorId">
      
      <div class="form-group">
        <label for="vendor-code">Code *</label>
        <input 
          type="text" 
          id="vendor-code" 
          name="vendorCode" 
          required 
          class="form-control">
      </div>

      <div class="form-group">
        <label for="vendor-name">Name *</label>
        <input 
          type="text" 
          id="vendor-name" 
          name="vendorName" 
          required 
          class="form-control">
      </div>

      <div class="form-group">
        <label for="vendor-email">Email</label>
        <input 
          type="email" 
          id="vendor-email" 
          name="vendorEmail" 
          class="form-control">
      </div>

      <div class="hstack gap-2 mt-4">
        <button type="submit" class="button primary">Save</button>
        <a href="/vendors" class="button secondary" router-link>Cancel</a>
      </div>
    </form>
  </div>
</div>
```

```javascript
// public/apps/main/views/vendors/edit/index.js
import { log } from '../../../js/log.js'
import { $, $$ } from '../../../js/dom.js'
import { backendRpc } from '../../../js/backend.js'
import { routerNavigate } from '../../../js/router.js'
import { AlertBox, ConfirmBox } from '../../../components/Modal/Dialogs.js'

const logContext = 'VIEWS:VENDORS:EDIT'

export async function show (params) {
  log('View shown', logContext)

  const { id } = params

  // Load vendor data if editing
  if (id) {
    const response = await backendRpc('app/masterdata/vendor', 'findById', {
      vendorId: id
    })

    if (response.status.error) {
      AlertBox({
        target: '#vendor-form',
        message: response.status.message,
        type: 'error'
      })
      return
    }

    // Populate form
    const vendor = response.data
    $('#vendor-id').value = vendor.id
    $('#vendor-code').value = vendor.code
    $('#vendor-name').value = vendor.name
    $('#vendor-email').value = vendor.email || ''
  }

  // Handle form submission
  $('#vendor-form').addEventListener('submit', async (event) => {
    event.preventDefault()

    const formData = new FormData(event.target)
    const data = Object.fromEntries(formData.entries())

    const response = await backendRpc('app/masterdata/vendor', 'save', data)

    if (response.status.error) {
      AlertBox({
        target: '#vendor-form',
        message: response.status.message,
        type: 'error'
      })
    } else {
      ConfirmBox({
        target: '#vendor-form',
        message: 'Vendor saved successfully!',
        onConfirm: () => {
          routerNavigate('/vendors?reload=true')
        }
      })
    }
  })
}

export async function hide () {
  log('View hidden', logContext)
}
```

---

### Using Components

#### DataTable Component

Display paginated, searchable, sortable data from backend:

```javascript
import { DataTable } from '../../components/Tables/DataTable.js'

const table = DataTable({
  target: '#my-table',           // Container selector
  params: ['app/module', 'list'], // RPC endpoint
  options: {
    title: 'My Data',
    orderCol: 'created_at',
    orderDir: 'desc'
  },
  columns: {
    id: {
      visible: false              // Hide column
    },
    name: {
      visible: true,
      header: 'Name',             // Column header
      sortable: true,             // Enable sorting
      align: 'left',              // left, center, right
      transform: (value, row, id) => {
        // Custom render function
        return `<strong>${value}</strong>`
      }
    },
    status: {
      visible: true,
      header: 'Status',
      transform: (value) => {
        const colors = {
          ACTIVE: 'green',
          INACTIVE: 'red'
        }
        return `<span style="color: ${colors[value]}">${value}</span>`
      }
    }
  }
})

// Reload table
table.reload()

// Search table
table.search('keyword')
```

#### Modal Dialogs

```javascript
import { 
  AlertBox, 
  ConfirmBox, 
  ConfirmBoxYesNo, 
  PromptBox 
} from '../../components/Modal/Dialogs.js'

// Alert message
AlertBox({
  target: '#container',
  message: 'Operation successful!',
  type: 'success'  // success, error, warning, info
})

// Confirmation dialog (OK button)
ConfirmBox({
  target: '#container',
  message: 'Record saved successfully!',
  onConfirm: () => {
    console.log('User clicked OK')
  }
})

// Yes/No dialog
ConfirmBoxYesNo({
  target: '#container',
  message: 'Are you sure you want to delete this record?',
  onYes: () => {
    // Delete the record
  },
  onNo: () => {
    // Cancel
  }
})

// Prompt dialog
PromptBox({
  target: '#container',
  message: 'Enter a reason for cancellation:',
  onConfirm: (value) => {
    console.log('User entered:', value)
  },
  onCancel: () => {
    console.log('User cancelled')
  }
})
```

#### Toggle Switch

Replace checkboxes with styled toggle switches:

```html
<toggle-switch id="is-active">Is Active</toggle-switch>
```

```javascript
import '../../components/index.js'

// Get value (same API as checkbox)
const isActive = $('#is-active').checked

// Set value
$('#is-active').checked = true

// Listen for changes
$('#is-active').addEventListener('change', (event) => {
  console.log('New value:', event.target.checked)
})
```

#### Date Picker

```html
<date-picker id="start-date"></date-picker>
```

```javascript
// Get value (Unix timestamp)
const timestamp = $('#start-date').value

// Set value
$('#start-date').value = Date.now()
```

#### Forms Search

```html
<forms-search 
  id="search-input" 
  placeholder="Search..." 
  width="300px">
</forms-search>
```

---

### Calling Backend APIs

Use the `backendRpc()` function to call backend endpoints:

```javascript
import { backendRpc } from '../../js/backend.js'

// Basic call
const response = await backendRpc(
  'app/masterdata/vendor',  // Module path
  'list',                    // Function name
  {                          // Arguments
    search: '%',
    page: 1,
    size: 10
  }
)

// Response structure
{
  status: {
    error: false,           // true if error occurred
    code: 1000,            // Error/success code
    message: 'ok',         // Error message
    timestamp: 1706140800,
    elapsed: 42,           // ms
    exec_id: '...',
    executor: 'user@example.com'
  },
  data: {                  // Response data (null if error)
    rows: [...],
    total: 100,
    page: 1,
    size: 10
  },
  origin: 'app/masterdata/vendor:list'
}

// Handle response
if (response.status.error) {
  console.error('Error:', response.status.message)
  AlertBox({
    target: '#container',
    message: response.status.message,
    type: 'error'
  })
} else {
  console.log('Success:', response.data)
}
```

#### Public Endpoints (No Authentication)

For public endpoints (e.g., login), use the `/public` suffix in the module path:

```javascript
// Login endpoint (no auth required)
const response = await backendRpc(
  'app/auth/public',  // Note the '/public' suffix
  'login',
  {
    email: 'user@example.com',
    password: 'password123'
  }
)

if (!response.status.error) {
  // Token is automatically stored in cookie and localStorage
  const { token, userName, userEmail } = response.data
}
```

---

### Routing

The application uses a custom SPA router with automatic view loading.

#### Router Links

Use `router-link` attribute on anchors to enable SPA navigation:

```html
<!-- Standard link -->
<a href="/vendors" router-link>Vendors</a>

<!-- Link with query parameters -->
<a href="/vendors/edit?id=123" router-link>Edit</a>

<!-- Dynamic link (in DataTable transform) -->
transform: (value, row) => {
  return `<a href="/vendors/edit?id=[id]" router-link>Edit</a>`
  // [id] is replaced with row.id
}
```

#### Programmatic Navigation

```javascript
import { routerNavigate } from '../../js/router.js'

// Navigate to route
routerNavigate('/vendors')

// Navigate with query parameters
routerNavigate('/vendors/edit?id=123')

// Navigate with reload parameter
routerNavigate('/vendors?reload=true')
```

#### Route to View Mapping

Routes are automatically converted to view IDs:

| Route | View ID | File Location |
|-------|---------|---------------|
| `/vendors` | `view_vendors` | `public/apps/main/views/vendors/` |
| `/vendors/edit` | `view_vendors_edit` | `public/apps/main/views/vendors/edit/` |
| `/inventory/movements` | `view_inventory_movements` | `public/apps/main/views/inventory/movements/` |

Convention: `/{path}/{segments}` → `view_{path}_{segments}` (snake_case)

#### View Lifecycle

```javascript
// index.js must export these functions:

/**
 * Called when view is first loaded and every time it's shown
 * @param {Object} params - URL query parameters
 */
export async function show (params) {
  // params is an object: ?id=123&reload=true → { id: '123', reload: 'true' }
  
  // Initialize view, load data, setup event listeners
}

/**
 * Called when view is hidden (optional)
 */
export async function hide () {
  // Cleanup, remove event listeners, etc.
}
```

---

## Database Development

### Creating Migrations

**1. Create migration**:
```bash
node --env-file=.env server/migrations/index.js new -n create_vendor_table
```

**2. Edit migration file** (`server/migrations/sql/YYYYMMDDHHMMSS_create_vendor_table.sql`):

```sql
-- UP
CREATE TABLE IF NOT EXISTS masterdata.vendor (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  plant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_by UUID NOT NULL,
  created_at BIGINT NOT NULL,
  updated_by UUID,
  updated_at BIGINT,
  
  CONSTRAINT fk_vendor_entity 
    FOREIGN KEY (entity_id) 
    REFERENCES auth.entity(id),
  
  CONSTRAINT fk_vendor_plant 
    FOREIGN KEY (plant_id) 
    REFERENCES interview.plant(id),
  
  CONSTRAINT fk_vendor_created_by 
    FOREIGN KEY (created_by) 
    REFERENCES auth.user(id),
  
  CONSTRAINT fk_vendor_updated_by 
    FOREIGN KEY (updated_by) 
    REFERENCES auth.user(id),
  
  CONSTRAINT uk_vendor_code 
    UNIQUE (entity_id, plant_id, code)
);

CREATE INDEX idx_vendor_entity_plant ON masterdata.vendor(entity_id, plant_id);
CREATE INDEX idx_vendor_name ON masterdata.vendor(name);

COMMENT ON TABLE masterdata.vendor IS 'Vendor master data';
COMMENT ON COLUMN masterdata.vendor.code IS 'Unique vendor code within entity/plant';

-- DOWN
DROP TABLE IF EXISTS masterdata.vendor CASCADE;
```

**3. Run migration**:
```bash
node --env-file=.env server/migrations/index.js up
```

**4. Rollback if needed**:
```bash
node --env-file=.env server/migrations/index.js down
```

### Database Conventions

1. **Schemas**:
   - `auth.*` - Authentication and authorization tables
   - `interview.*` - Factory/production tables
   - `masterdata.*` - Master data tables

2. **Table naming**: `snake_case`, singular or plural based on domain

3. **Column naming**: 
   - `snake_case`
   - IDs: `{table}_id` (e.g., `vendor_id`)
   - Timestamps: Use BIGINT (Unix epoch in milliseconds)
   - Audit fields: `created_by`, `created_at`, `updated_by`, `updated_at`

4. **Primary keys**: UUID type

5. **Multi-tenancy**: Always include `entity_id` and `plant_id` foreign keys

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx playwright test tests/e2e/login.spec.js

# Run with UI
npx playwright test --ui
```

### Writing Tests

```javascript
// tests/e2e/vendors.spec.js
import { test, expect } from '@playwright/test'

test.describe('Vendor Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/main/login')
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/main/default')
  })

  test('should create new vendor', async ({ page }) => {
    await page.goto('/main/vendors')
    await page.click('text=New Vendor')
    
    await page.fill('#vendor-code', 'VEN001')
    await page.fill('#vendor-name', 'Test Vendor')
    await page.fill('#vendor-email', 'vendor@test.com')
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Vendor saved successfully')).toBeVisible()
  })

  test('should list vendors', async ({ page }) => {
    await page.goto('/main/vendors')
    
    await expect(page.locator('#vendors__table')).toBeVisible()
    await expect(page.locator('table tbody tr')).toHaveCount(10)
  })
})
```

---

## Code Style Guide

### JavaScript

Follow [StandardJS](https://standardjs.com/) style:

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

**Key conventions**:
- No semicolons (except at start of line when needed)
- 2 spaces indentation
- Single quotes for strings
- Always use `const` or `let`, never `var`
- Arrow functions preferred for callbacks
- Trailing commas in multiline objects/arrays

### File Naming

- **Server**: `camelCase.js`
- **Frontend utilities**: `camelCase.js`
- **Frontend components**: `PascalCase.js`
- **Views**: `index.html` + `index.js`

### Function Documentation

Use JSDoc comments for exported functions:

```javascript
/**
 * Find vendor by ID
 * @param {Object} context - Application context
 * @param {string} entityId - Entity ID (tenant)
 * @param {string} plantId - Plant ID
 * @param {string} vendorId - Vendor ID
 * @param {Object} [client=null] - Database client for transactions
 * @returns {Promise<Object|null>} Vendor data or null
 */
const findById = async (context, entityId, plantId, vendorId, client = null) => {
  // Implementation
}
```

### Import Order

1. Node.js built-in modules
2. External dependencies
3. Internal modules (config, utils)
4. Repositories/Services
5. Components

```javascript
// Node.js
import path from 'node:path'

// External
import express from 'express'

// Internal
import config from '../config.js'
import { db } from '../platform/db/index.js'
import log from '../platform/log.js'

// Repositories
import { vendorRepository } from '../repositories/vendor.js'

// Utils
import { uuid } from '../utils/index.js'
import { ApiResponseOk } from '../utils/response.js'
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server with auto-reload
npm start                # Start production server
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues

# Database
node --env-file=.env server/migrations/index.js new -n migration_name
node --env-file=.env server/migrations/index.js up
node --env-file=.env server/migrations/index.js down
bash scripts/dbdeploy.sh

# Testing
npm test                 # Run tests
npx playwright test --ui # Run tests with UI
```

### File Locations Cheat Sheet

| What | Where |
|------|-------|
| API endpoints | `server/api/app/{domain}/{module}/api.js` |
| Public APIs (no auth) | `server/api/app/{domain}/public/api.js` |
| Repositories | `server/repositories/{name}.js` |
| Services | `server/services/{name}.js` |
| Views | `public/apps/{app}/views/{route}/index.html` + `index.js` |
| Components | `public/components/{Component}/{Component}.js` |
| Utilities | `public/js/{utility}.js` or `server/utils/{utility}.js` |
| Migrations | `server/migrations/sql/*.sql` |

### Import Paths

```javascript
// Backend (from api/app/domain/module/api.js)
import { ApiResponseOk } from '../../../../utils/response.js'
import { vendorRepository } from '../../../../repositories/vendor.js'
import config from '../../../../config.js'

// Frontend (from public/apps/main/views/vendors/index.js)
import { backendRpc } from '../../js/backend.js'
import { $ } from '../../js/dom.js'
import { DataTable } from '../../components/Tables/DataTable.js'
```

---

## Need Help?

- Check `CONSTITUTION.md` for architecture details
- Review existing implementations in `server/api/app/` and `public/apps/main/views/`
- Database schema: Run `\d+ table_name` in PostgreSQL
- Debug mode: Set `CONFIG_DEBUG=true` in `.env`

Happy coding! 🚀
