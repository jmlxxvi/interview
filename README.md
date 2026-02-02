# Technical Interview Guide

## Overview

This guide provides interview questions for candidates who will maintain and develop features for this codebase. 
The questions are organized by difficulty level and topic area, focusing on the specific technologies and patterns used in this codebase.

**Note: The responses should be related to this specific codebase. Any examples or code response should be about the code on the repository.**

---

## Table of Contents

1. [JavaScript & Node.js Fundamentals](#javascript--nodejs-fundamentals)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Database & PostgreSQL](#database--postgresql)
4. [Frontend Development](#frontend-development)
5. [API Design & RPC Architecture](#api-design--rpc-architecture)
6. [Security & Authentication](#security--authentication)
7. [Testing](#testing)
8. [Practical Coding Exercises](#practical-coding-exercises)
9. [System Design & Scaling](#system-design--scaling)
10. [Debugging & Problem Solving](#debugging--problem-solving)

---

## JavaScript & Node.js Fundamentals

### Junior Level

**Q1: What is the difference between `const`, `let`, and `var`?**

**Q2: Explain the difference between `async/await` and Promises.**

**Q3: What does `import` and `export` do? What is the difference between default and named exports?**

### Mid Level

**Q4: In this code, what will happen and why?**
```javascript
export async function save (args, context) {
  const { vendorId, vendorName } = args
  
  if (vendorId) {
    const response = await vendorRepository.update(context, vendorId, vendorName)
    return ApiResponseOk(response)
  } else {
    const response = await vendorRepository.create(context, uuid(), vendorName)
    return ApiResponseOk(response)
  }
}
```

**Q5: Explain how `process.env` works and how our application loads environment variables.**

**Q6: What is the purpose of the `--watch` flag in our dev script?**

### Senior Level

**Q7: Explain the event loop in Node.js and how it affects our application's performance.**

**Q8: How would you optimize this code?**
```javascript
export async function getWorkOrderDetails (args, context) {
  const { workOrderId } = args
  const workOrder = await workOrderRepository.findById(workOrderId)
  const batches = await batchRepository.findByWorkOrderId(workOrderId)
  const operations = await operationRepository.findByWorkOrderId(workOrderId)
  const materials = await materialRepository.findByWorkOrderId(workOrderId)
  return ApiResponseOk({ workOrder, batches, operations, materials })
}
```

## Architecture & Design Patterns

### Junior Level

**Q9: What is the Repository pattern and why do we use it?**

**Q10: Explain the MVC pattern. Does this application follow it?**

### Mid Level

**Q11: Explain the RPC architecture used in this application.**
```javascript
// Frontend
const response = await backendRpc('app/masterdata/vendor', 'list', { page: 1 })

// Backend
export async function list (args, context) {
  // Implementation
}
```

**Q12: What is the Result monad pattern? How is it used in this codebase?**
```javascript
const result = await vendorRepository.findById(id)
if (result.isError()) {
  return ApiResponseResult(result, 2001)
}
return ApiResponseOk(result.value)
```

**Q13: Explain the multi-tenant architecture used in this application.**

### Senior Level

**Q14: How would you implement a new service that needs to coordinate multiple repositories in a transaction?**

**Q15: Design a caching strategy for this application. Where would you cache and why?**

## Database & PostgreSQL

### Junior Level

**Q16: What is SQL injection and how does this codebase prevent it?**

**Q17: What is the difference between `INNER JOIN` and `LEFT JOIN`?**

**Q18: What is an index and when should you create one?**

### Mid Level

**Q19: Explain this query and identify potential issues:**
```javascript
const query = `
  SELECT v.*, u.full_name
  FROM masterdata.vendor v
  LEFT JOIN auth.user u ON v.created_by = u.id
  WHERE v.name ILIKE '%${searchTerm}%'
`
```

**Q20: What is the purpose of database migrations in this application?**

**Q21: Explain the difference between `db.query()`, `db.row()`, and `db.value()`.**

### Senior Level

**Q22: Design a database schema for a new feature: Quality Control Inspections with the following requirements:**
- Track inspection results for batches
- Support multiple inspection checkpoints per batch
- Store measurements (numeric values, pass/fail, text notes)
- Maintain audit trail
- Multi-tenant

**Q23: Optimize this query that's causing performance issues:**
```javascript
const query = `
  SELECT * FROM interview.batch b
  WHERE b.entity_id = $1
  AND b.plant_id = $2
  AND b.status = 'IN_PROGRESS'
  AND EXISTS (
    SELECT 1 FROM interview.batch_operation bo
    WHERE bo.batch_id = b.id
    AND bo.status = 'PENDING'
  )
`
```

**Q24: How would you handle a long-running data migration (e.g., updating 10 million rows)?**

## Frontend Development

### Junior Level

**Q25: What is the DOM and how do we interact with it in this application?**

**Q26: Explain event delegation and why it's useful.**

**Q27: What is the purpose of `router-link` attribute in this application?**
```html
<a href="/vendors" router-link>Vendors</a>
```

### Mid Level

**Q28: Explain how the custom router works in this SPA:**
```javascript
// URL: /main/vendors/edit?id=123
// How does it load the view?
```

**Q29: What is the DataTable component and how do you use it?**
```javascript
const table = DataTable({
  target: '#vendors-table',
  params: ['app/masterdata/vendor', 'list'],
  columns: {
    name: { visible: true, header: 'Name', transform: (value) => `<strong>${value}</strong>` }
  }
})
```

**Q30: How would you create a new reusable form component following this codebase's patterns?**

### Senior Level

**Q31: The DataTable shows stale data after a user creates a new vendor. How would you fix this?**

**Q32: Implement a custom Web Component for a number input with currency formatting:**
```javascript
// Usage: <currency-input id="price" value="1234.56"></currency-input>
// Display: $1,234.56
// On focus: 1234.56 (editable)
```

## API Design & RPC Architecture

### Junior Level

**Q33: How does a frontend component call a backend API in this application?**

**Q34: What information is available in the `context` parameter?**
```javascript
export async function save (args, context) {
  const { entityId, plantId, userId } = context.session
  // ...
}
```

### Mid Level

**Q35: Create a new API endpoint to get vendor statistics:**

Requirements:
- Module: `app/masterdata/vendor`
- Function: `getStatistics`
- Return: Total count, active count, inactive count
- Must respect entity/plant scoping

**Q36: What is the difference between a public and protected API endpoint?**

### Senior Level

**Q37: Design an API endpoint for bulk operations that need to:**
- Create/update multiple vendors in one request
- Return individual results for each operation
- Handle partial failures gracefully

## Security & Authentication

### Junior Level

**Q38: What is the purpose of password hashing?**

**Q39: What is XSS (Cross-Site Scripting) and how do we prevent it?**

### Mid Level

**Q40: Explain how authentication works in this application:**

User enters credentials → ???? → User accesses protected routes

**Q41: What is CORS and why is it configured in this application?**

**Q42: How does this application handle authorization (permissions/roles)?**

### Senior Level

**Q43: A user reports they can see data from another entity. How would you investigate and fix?**

**Q44: Implement rate limiting for the login endpoint to prevent brute force attacks.**

## Testing

### Junior Level

**Q45: What is the difference between unit tests, integration tests, and E2E tests?**

**Q46: What is Playwright and what does it test?**

### Mid Level

**Q47: Write a Playwright test for the login flow:**

**Q48: How would you test a repository function?**

### Senior Level

**Q49: Design a testing strategy for this application covering all layers.**

**Q50: The test database is polluted with data from previous test runs. How do you ensure test isolation?**

## Practical Coding Exercises

### Exercise 1: Implement a New Feature (45-60 minutes)

**Requirement**: Add a "Notes" feature to vendors that allows users to:
1. Add timestamped notes to a vendor
2. List all notes for a vendor
3. Edit/delete their own notes
4. View who created each note

**Deliverables**:
- Database migration
- Repository functions
- API endpoints
- Frontend view

**Evaluation Criteria**:
- Multi-tenant scoping
- Proper error handling
- Security (users can only edit their own notes)
- Code follows existing patterns

---

### Exercise 2: Debug a Bug (15-30 minutes)

**Scenario**: Users report that when they search for vendors, they sometimes see vendors from other entities.

**Given Code**:
```javascript
export async function search (args, context) {
  const { searchTerm } = args
  
  const query = `
    SELECT * FROM masterdata.vendor
    WHERE name ILIKE $1
    ORDER BY name
  `
  
  const results = await db.query(query, [`%${searchTerm}%`])
  return ApiResponseOk(results)
}
```

**Tasks**:
1. Identify the security issue
2. Fix the code
3. Suggest how to prevent this in the future
4. Write a test to verify the fix

### Exercise 3: Optimize Performance (30 minutes)

**Scenario**: The Work Order Details page is slow (3-5 seconds to load).

**Given Code**:
```javascript
export async function getWorkOrderDetails (args, context) {
  const { workOrderId } = args
  const { entityId, plantId } = context.session
  
  const workOrder = await db.row(
    'SELECT * FROM interview.work_order WHERE id = $1',
    [workOrderId]
  )
  
  const batches = await db.query(
    'SELECT * FROM interview.batch WHERE work_order_id = $1',
    [workOrderId]
  )
  
  for (const batch of batches) {
    batch.operations = await db.query(
      'SELECT * FROM interview.batch_operation WHERE batch_id = $1',
      [batch.id]
    )
    
    batch.materials = await db.query(
      'SELECT * FROM interview.batch_material WHERE batch_id = $1',
      [batch.id]
    )
  }
  
  return ApiResponseOk({ workOrder, batches })
}
```

**Tasks**:
1. Identify performance issues
2. Optimize using better SQL
3. Add appropriate indexes
4. Explain the performance improvement

### Exercise 4: Add Validation (20 minutes)

**Requirement**: Add input validation to the vendor save endpoint.

**Rules**:
- Vendor code: Required, 2-50 characters, alphanumeric + hyphens
- Vendor name: Required, 3-255 characters
- Email: Optional, valid email format if provided

## System Design & Scaling

### Q51: How would you scale this application to handle 10x more users?

### Q52: How would you implement real-time notifications for work order status changes?

## Debugging & Problem Solving

### Q53: Users report intermittent "session expired" errors. How do you debug?

### Q54: A migration failed halfway through. How do you recover?

### Q55: Production database is running out of disk space. Immediate actions? Long term solutions?

## Scenario-Based Questions

### Q56: A user accidentally deleted 500 vendor records. How do you recover? How do you prevent it in the future?

### Q57: Performance degrades every day at 2 AM. How do you investigate?

### Q58: A critical bug is found in production. Walk through your deployment process to fix it.

## Cultural Fit & Soft Skills

### Q59: How do you approach learning a new codebase?

### Q60: You disagree with an architectural decision in the codebase. What do you do?

### Q61: How do you ensure code quality in your work?

