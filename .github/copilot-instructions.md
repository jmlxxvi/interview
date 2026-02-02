# MES Factory System - AI Agent Instructions

## Architecture Overview

This is a **full-stack Node.js application** with a custom RPC architecture:
- **Backend**: Express.js server (`server/`) using PostgreSQL database
- **Frontend**: Vanilla JavaScript SPA (`public/`) with custom router and component system

### Key Architectural Patterns

**RPC-based API Communication** (Critical Pattern):
- Client calls: `backendRpc(mod, fun, args)` → `POST /api` with `{mod, fun, args, token}`
- Server routes to: `server/api/{mod}/api.js` exporting functions matching `fun`
- Response format: `{error, code, data, message}` via `ApiResponse*` helpers (`server/utils/response.js`)
- Token-based auth using `server/platform/session.js` (PostgreSQL-backed sessions)

**Module Convention**:
- Public endpoints: `server/api/{app}/public/api.js` (no auth required, `/public` suffix in mod path)
- Protected endpoints: `server/api/{app}/{module}/api.js` (requires session token)
- Example: `backendRpc('masterdata/vendor', 'list', {search: '%'})` → `server/api/masterdata/vendor/api.js::list()`

**Repository Pattern** (`server/repositories/`):
- Use `createBaseRepository(tableName)` for CRUD operations
- Built-in support for: `create()`, `update()`, `findById()`, `tablePaginated()`, transaction support
- Query builder supports operators: `$eq`, `$gt`, `$in`, `$like`, `$ilike`, custom `$expr` for SQL expressions
- Always use snake_case for database columns, camelCase in JS (auto-converted via `keysToCamel`)
- Prefer repositories over raw SQL queries for data access
- The first argument to repository functions is always `context` (contains session info, etc.)
- The last argument can be `client` (db client object) used for transactional operations. If null, uses default connection pool.
- The application context object contains:
  - `session`: session info (userId, entityId, plantId, isAdmin, etc.)
  - `ip`: client IP address
  - `userAgent`: client user agent string
  - `now`: current timestamp
  - `config`: application config object (`server/config.js`)
- The application is multitenant: `entityId` and `plantId` are used to scope data access
- Example repository function call:
  ```javascript
  const findById = async (context, entityId, plantId, operationId, client = null) => {
    const query = `
            SELECT 
              ope.id,
              ope.code,
              ope."name",
              ope.standard_duration,
              ope.description,
              ope.created_at,
              us1.full_name as "created_by",
              ope.updated_at,
              us2.full_name as "updated_by"
            FROM interview.operation ope
            inner join auth.user us1 on (ope.created_by = us1.id)
            left join auth.user us2 on (ope.updated_by = us2.id)
            where 1=1
            and ope.id = $1
            -- Entity and Plant filtering
            AND ope.entity_id = $2
            AND ope.plant_id = $3
            AND us1.entity_id = $2
            AND (us2.entity_id = $2 OR us2.entity_id IS NULL)
            LIMIT 1`

    const bind = [operationId, entityId, plantId]

    const response = await db.row(query, bind, client)

    return response
  }
  ```
**Services Pattern** (`server/services/`):
- Business logic layer, uses repositories for data access
- Called from API endpoints
- Example: `server/services/planning.js`
- Keeps API layer thin, focuses on request/response handling
- Call the repositories from services, not directly from API handlers
- Helps separate business logic from transport layer
- Supports complex operations involving multiple repositories and database transactions 
- Example service function call:
  ```javascript
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
  ```

**Result Monad Pattern**:
- Use `Result.ok(value)` / `Result.fail(error)` from `server/utils/result.js`
- API endpoints can return:  `ApiResponseOk(result)`,  `ApiResponseError(errorCode, errorMessage)` or `ApiResponseResult(result, errorCode)`. Other result functions are defined on `server/utils/result.js`
- Prevents throwing errors, explicit error handling throughout

**Frontend Router** (`public/js/router.js`):
- SPA routing via `router-link` attribute on anchors
- Views loaded from `public/views/{route}/index.html` + `index.js`
- Path `/customers/view` → view ID `customer_view` (snake_case convention)
- Use `routerNavigate('/path')` programmatically

**Unique IDs UUIDs**:
- Frontend `public/js/utils.js` function `uuid()`
- Backend `server/utils/index.js` function `uuid()`

## Development Workflow

**Running the app**:
```bash
npm run dev    # Development mode with --watch (auto-restart on changes)
npm start      # Production mode
```

**Database operations**:
```bash
# Migrations (uses server/migrations/)
node --env-file=.env server/migrations/index.js new -n migration_name
node --env-file=.env server/migrations/index.js up
node --env-file=.env server/migrations/index.js down

# Database deployment
bash scripts/dbdeploy.sh
```

**Environment**: Uses `--env-file=.env` flag (Node 20+), not dotenv package

**Linting**: StandardJS (`npm run lint`, `npm run lint:fix`)

## Critical Conventions

**File Naming**:
- Server: `camelCase.js` for utilities, `index.js` for module entry points
- Frontend: `PascalCase.js` for components, `camelCase.js` for utilities
- Views: `index.html` + `index.js` per route folder

**Database**:
- Use `db.query(query, bind)` for raw SQL with parameterized queries (`$1, $2, ...`)
- Use ``db.row(query, bind)`` for single-row results, returns an object or null when no rows
- Use ``db.value(query, bind)`` for single-column results, returns the value or null when no rows
- Use `createBaseRepository(tableName)` for standard CRUD operations
- Connection via `config.db.url` (PostgreSQL URL)
- Schema: `auth.*` for auth tables, domain-specific schemas for app tables
- Alias for tables in queries: use first 3 characters, add a number if needed (e.g. `ven1`, `ven2`)

**Frontend Components**:
- Web Components pattern (see `public/components/`)
- Import via `import '../components/index.js'` in views
- DataTable component: `DataTable({target, params: [mod, fun], columns})` for RPC-backed tables
- ToggleSwitch component: `<toggle-switch id="element_id">Label</toggle-switch>` for boolean toggles, replaces html checkboxes, same API
- AlertBox component: `AlertBox({target, message, type})` for displaying alert messages
- PromptBox component: `PromptBox({target, message, onConfirm, onCancel})` for confirmation dialogs
- ConfirmBox component: `ConfirmBox({target, message, onConfirm})` for simple OK dialogs
- ConfirmBoxYesNo component: `ConfirmBoxYesNo({target, message, onYes, onNo})` for Yes/No dialogs
- Date Picker web component: `<date-picker></date-picker>` for date inputs

**Session Management**:
- Token stored in localStorage via `storage.js`
- Backend validates via `session.check(token)` (checks `auth.session` table)
- Middleware: `middlewareAuthorization` (currently TODO/stub)

**Error Codes**:
- 1000: Success
- 1002: Not authorized / Invalid session
- 1012: Timeout
- 1040: Input validation error
- 1100: Server error / Output validation error
- 1500: Permission denied
- 2000+: Domain-specific errors

## Common Patterns

**Adding a new API endpoint**:
1. Create `server/api/{app}/{module}/api.js`
2. Export async function: `export async function myFunc(args, context) {}`
3. Use repository pattern for data access
4. Return `ApiResponseResult(result, errorCode)` or `ApiResponseOk(data)`
5. Call from frontend: `backendRpc('{app}/{module}', 'myFunc', {...})`

**Adding a new view**:
1. Create `public/views/{route}/index.html` + `index.js`
2. Use router links: `<a href="/route" router-link>Link</a>`
3. Import components needed in `index.js`
4. Load data via `backendRpc()`

**Database queries**:
```javascript
// Repository pattern (preferred)
const result = await vendorRepository.findById(id)
if (result.isError()) return ApiResponseResult(result, 2000)

// Raw SQL
const data = await db.query('SELECT * FROM vendors WHERE id = $1', [id])
```

## Integration Points

- **WebSockets**: `server/web/websockets.js` (enabled via `config.websockets.enabled`)
- **Email**: `server/platform/services/email/` (uses Nodemailer, configured via `config.services.email`)
- **Cron Jobs**: `server/cron/` with custom scheduler (see `server/cron/README.md` for syntax)
- **File Uploads**: Multer-based, stored in `storage/uploads/` (organized by UUID subdirectories)
- **Cache**: Redis client abstraction in `server/platform/cache/` (optional, check config)

## Security Notes

- Passwords hashed via scrypt (`server/platform/security.js::passwordHash()`)
- Frontend XSS protection: Use `securitySafeHtml()` from `public/js/security.js` for user content
- CORS configured in `server/config.js::security.cors`
- SQL injection prevention: Always use parameterized queries (`$1, $2`)

## Build System

Optional minification via `scripts/build.js`:
- Combines/minifies JS files from `public/js/` → `.build/js/index.js`
- Combines/minifies CSS from `public/css/styles.css` → `.build/css/styles.css`
- Generates `config.js` from `CONFIG_*` environment variables
- Build is optional, not required for development

## Testing

Currently minimal test coverage (`testing/frontend/` exists but sparse). When adding tests, follow the existing structure.
