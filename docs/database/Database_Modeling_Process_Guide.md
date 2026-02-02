
# Database Modeling Process Guide

## 1. Introduction & Purpose
Objective: Establish a consistent, rigorous approach to database modeling that ensures scalability, maintainability, and performance for our web application.

Why this matters: A well-designed database foundation reduces technical debt, improves performance, and simplifies future feature development.

Example Context: We'll model an E-commerce Platform with users, products, orders, and reviews.

## 2. Process Overview

```
Requirements → Conceptual Model → Logical Model → Physical Model → Review & Validation
```

## 3. Phase 1: Requirements Gathering

### 3.1 Business Requirements - E-commerce 

- Document core business entities and relationships
- Identify all data stakeholders
- Map business processes to data flows
- Define data ownership and governance rules

```
Business Entities:
1. Customer - Individuals who register and purchase products
2. Product - Items available for sale with inventory tracking
3. Order - Purchase transaction containing multiple products
4. Review - Customer feedback on purchased products
5. Category - Product classification hierarchy

Business Rules:
- Customers must register before purchasing
- Orders can contain multiple products with varying quantities
- Products have inventory levels that must be tracked
- Reviews can only be left by customers who purchased the product
- Orders go through statuses: pending → processing → shipped → delivered
```

## 4. Phase 2: Conceptual Modeling

Goal: Business-level understanding of data

### 4.1 Identify Core Entities

- List all entities (nouns in business domain)
- Define entity descriptions and purposes
- Example: User, Order, Product, Invoice

```
ENTITY: Customer
PURPOSE: Registered users who can place orders
RELATIONSHIPS: Places Orders, Writes Reviews, Has Shipping Addresses

ENTITY: Product
PURPOSE: Items available for purchase
RELATIONSHIPS: Belongs to Categories, Has Inventory, Receives Reviews

ENTITY: Order
PURPOSE: Purchase transaction
RELATIONSHIPS: Contains Products, Belongs to Customer, Has Payments

ENTITY: OrderItem
PURPOSE: Individual product within an order with quantity and price
RELATIONSHIPS: Links Order and Product

ENTITY: Review
PURPOSE: Customer feedback on purchased products
RELATIONSHIPS: Written by Customer, About Product
```

### 4.2 Define Relationships

- Document entity relationships (one-to-one, one-to-many, many-to-many)
- Use simple diagrams or lists
- Identify cardinality and optionality

```
Customer --(1:N)--> Order
Customer --(1:N)--> Review
Customer --(1:N)--> Address

Order --(1:N)--> OrderItem
Order --(1:1)--> Payment

Product --(1:N)--> OrderItem
Product --(1:N)--> Review
Product --(N:M)--> Category (through ProductCategory)
```

### 4.3 Setting Deletion Policies

There are three main paths your team should choose from for every relationship.

A. ON DELETE CASCADE (The "Automatic Cleanup")
Use this when the child record cannot exist without the parent. It is purely dependent.
The Rule: If the child is an integral part of the parent, use CASCADE.

B. ON DELETE SET NULL (The "Archive" approach)
Use this when the child record is valuable even if the parent is gone.
The Rule: If the child data has independent historical value, use SET NULL.

C. ON DELETE RESTRICT / NO ACTION (The "Safety Lock")
Use this to prevent accidental deletion of important data.
The Rule: If deleting the parent would cause a catastrophic loss of business data, use RESTRICT.

### 4.4 Deliverables

- Entity-Relationship Diagram (high-level)
- Business glossary with definitions
- List of business rules affecting data

Business Glossary Excerpt:
```
Customer: An individual who has registered on the platform. 
Must provide email and password. Can place orders and write reviews.

Order: A transaction representing purchase of one or more products.
Has status tracking and total amount. Each order has exactly one customer.

Product: An item available for sale. Has SKU, price, and inventory count.
Can belong to multiple categories.
```

## 5. Phase 3: Logical Modeling
Goal: Technology-agnostic detailed design

### 5.1 Attribute Definition
For each entity:

- List all attributes with descriptions
- Define data types (string, integer, date, etc.)
- Identify required vs. optional fields
- Define default values where applicable

```
ENTITY: Customer
ATTRIBUTES:
- customer_id (PK, integer, required)
- email (string, unique, required, max 255 chars)
- password_hash (string, required, 255 chars)
- first_name (string, required, max 100 chars)
- last_name (string, required, max 100 chars)
- phone (string, optional, max 20 chars)
- created_at (timestamp, required, default now())
- updated_at (timestamp, required, default now())
- is_active (boolean, required, default true)

ENTITY: Product
ATTRIBUTES:
- product_id (PK, integer, required)
- sku (string, unique, required, max 50 chars)
- name (string, required, max 200 chars)
- description (text, optional)
- price (decimal(10,2), required, min 0)
- cost_price (decimal(10,2), optional)
- inventory_count (integer, required, default 0, min 0)
- is_available (boolean, required, default true)
- weight_kg (decimal(5,3), optional)
- created_at (timestamp, required, default now())

ENTITY: Order
ATTRIBUTES:
- order_id (PK, integer, required)
- customer_id (FK → Customer, required)
- order_number (string, unique, required, pattern: ORD-YYYYMMDD-XXXXX)
- status (enum, required: 'pending', 'processing', 'shipped', 'delivered', 'cancelled')
- total_amount (decimal(10,2), required, min 0)
- tax_amount (decimal(10,2), required, default 0)
- shipping_amount (decimal(10,2), required, default 0)
- shipping_address_id (FK → Address, required)
- billing_address_id (FK → Address, required)
- placed_at (timestamp, required, default now())
- delivered_at (timestamp, optional)
```

### 5.2 Normalization (to at least 3NF)

- Eliminate repeating groups
- Remove partial dependencies
- Remove transitive dependencies
- Document normalization decisions

```
orders {
  order_id (PK),
  customer_id (FK),
  order_date,
  total_amount
}

order_items {
  order_item_id (PK),
  order_id (FK),
  product_id (FK),
  quantity,
  unit_price,
  line_total
}

products {
  product_id (PK),
  name,
  price,
  ...
}
```

### 5.3 Keys and Indexes

- Define primary keys (natural vs. surrogate)
- Identify foreign key relationships
- List candidate keys
- Note unique constraints

```
PRIMARY KEYS:
- customers.customer_id (surrogate key)
- products.product_id (surrogate key)
- orders.order_id (surrogate key)
- order_items.order_item_id (surrogate key)

FOREIGN KEYS:
- orders.customer_id → customers.customer_id
- order_items.order_id → orders.order_id
- order_items.product_id → products.product_id
- reviews.customer_id → customers.customer_id
- reviews.product_id → products.product_id

UNIQUE CONSTRAINTS:
- customers.email (unique)
- products.sku (unique)
- orders.order_number (unique)
```

### 5.4 Deliverables

- Detailed ERD with all attributes
- Data dictionary document
- Normalization documentation
- Relationship integrity rules

```
Data Dictionary Excerpt:

Table: order_items
Purpose: Link table between orders and products with quantity and pricing
Columns:
- order_item_id: INTEGER, Primary key, Auto-increment
- order_id: INTEGER, Foreign key to orders.order_id, NOT NULL
- product_id: INTEGER, Foreign key to products.product_id, NOT NULL
- quantity: INTEGER, Quantity purchased, NOT NULL, CHECK (quantity > 0)
- unit_price: DECIMAL(10,2), Price at time of purchase, NOT NULL
- line_total: DECIMAL(10,2), Calculated as quantity * unit_price, NOT NULL
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP

Relationships:
- One order has many order_items
- One product appears in many order_items
- Composite unique constraint: (order_id, product_id)
```

## 6. Phase 4: Physical Modeling
Goal: Database-specific implementation design

### 6.1 Organization Strategy
Objective: Use PostgreSQL schemas as logical containers to organize database objects by domain, security, or functional area.

Benefits:

- Logical separation of concerns
- Simplified permission management
- Easier maintenance and deployment
- Clear naming without prefixes
- Support for multi-tenant architecture patterns

Examples

```
-- Main schemas for our e-commerce example
CREATE SCHEMA IF NOT EXISTS core;          -- Foundation entities
CREATE SCHEMA IF NOT EXISTS sales;         -- Orders, payments, fulfillment
CREATE SCHEMA IF NOT EXISTS inventory;     -- Products, categories, stock
CREATE SCHEMA IF NOT EXISTS customers;     -- Users, profiles, addresses
CREATE SCHEMA IF NOT EXISTS analytics;     -- Reporting, aggregations
CREATE SCHEMA IF NOT EXISTS security;      -- Authentication, authorization
CREATE SCHEMA IF NOT EXISTS audit;         -- Change tracking
CREATE SCHEMA IF NOT EXISTS extensions;    -- Utility functions, custom types
```

### 6.2 Technology Considerations

- Version-specific features/limitations
- Storage engine considerations
- Replication/backup requirements
- Partitioning strategy (if needed)
- Materialized views consideration

### 6.3 Implementation Details

- Exact data types and sizes
- Default values and constraints
- Check constraints
- Triggers and stored procedures (minimal, with justification)
- Naming conventions (see Appendix A)

### 6.4 Table Definition - PostgreSQL Example

- Denormalization strategy (if any)
- Indexing strategy (covering indexes, partial indexes)
- Partitioning strategy (if needed)
- Materialized views consideration

```
-- Customers table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Add constraint for valid email format
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Products table with indexing strategy
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost_price DECIMAL(10,2) CHECK (cost_price >= 0),
    inventory_count INTEGER NOT NULL DEFAULT 0 CHECK (inventory_count >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    weight_kg DECIMAL(5,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure cost price is less than or equal to selling price
    CONSTRAINT cost_price_le_price CHECK (cost_price IS NULL OR cost_price <= price)
);

-- Orders table with enum type
CREATE TYPE order_status AS ENUM (
    'pending', 
    'processing', 
    'shipped', 
    'delivered', 
    'cancelled'
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
    shipping_address_id INTEGER NOT NULL,
    billing_address_id INTEGER NOT NULL,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure delivered date is after placed date if both exist
    CONSTRAINT valid_delivery_date 
        CHECK (delivered_at IS NULL OR delivered_at >= placed_at),
    
    -- Foreign keys to addresses (addresses table would be defined separately)
    FOREIGN KEY (shipping_address_id) REFERENCES addresses(address_id),
    FOREIGN KEY (billing_address_id) REFERENCES addresses(address_id)
);

-- Order items with computed column
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate products in same order
    UNIQUE (order_id, product_id)
);
```

### 6.5 Indexing Strategy - Performance Optimization

```
-- Customer lookup by email (frequent login operation)
CREATE INDEX idx_customers_email ON customers(email);

-- Product search indexes
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_price ON products(price) WHERE is_available = true;

-- Order queries
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_placed_at ON orders(placed_at DESC);

-- Order items for order retrieval
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Composite index for common query patterns
CREATE INDEX idx_orders_customer_date 
ON orders(customer_id, placed_at DESC) 
WHERE status IN ('delivered', 'shipped');
```


### 6.6 Deliverables

- Complete DDL scripts
- Index creation scripts
- Migration scripts (if applicable)
- Performance optimization plan

## 7. Phase 5: Review & Validation
### 7.1 Validation Examples - E-commerce Specific

```
✅ Business Requirements Check:
- Can customers place orders? Yes (orders table)
- Is inventory tracked? Yes (products.inventory_count)
- Can customers review purchased products? Yes (reviews table with customer-product validation)

✅ Performance Validation:
- Product search optimized with GIN index on name
- Order history pagination with composite index on (customer_id, placed_at)
- Inventory updates use row-level locking

✅ Security Validation:
- Passwords hashed (not stored plain text)
- Row-level security for customer data
- Audit logging for sensitive operations

✅ Data Integrity:
- Foreign key constraints prevent orphaned records
- Check constraints ensure valid data (price > 0, quantity > 0)
- Unique constraints prevent duplicates
```

### 7.2 Query Pattern Validation

```
-- Common application queries should be efficient:

-- 1. Customer order history (common dashboard query)
EXPLAIN ANALYZE
SELECT o.order_number, o.placed_at, o.status, o.total_amount,
       COUNT(oi.order_item_id) as item_count
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.customer_id = 123
GROUP BY o.order_id
ORDER BY o.placed_at DESC
LIMIT 10;

-- 2. Product search with filters
EXPLAIN ANALYZE
SELECT p.product_id, p.name, p.price, p.inventory_count
FROM products p
LEFT JOIN product_categories pc ON p.product_id = pc.product_id
LEFT JOIN categories c ON pc.category_id = c.category_id
WHERE p.is_available = true
  AND (p.name ILIKE '%laptop%' OR p.description ILIKE '%laptop%')
  AND p.price BETWEEN 500 AND 2000
  AND c.name = 'Electronics'
ORDER BY p.price ASC;
```

## 8. Appendix A: Naming Conventions
### 8.1 General Principles

- Use snake_case for all database objects
- Be descriptive but concise
- Avoid abbreviations unless widely understood
- Use consistent tense (prefer plural for tables)

### 8.2 Specific Conventions

- Tables: Plural nouns (users, order_items)
- Columns: Singular nouns, lowercase (first_name, created_at)
- Primary Keys: id (preferred) or table_name_id
- Foreign Keys: referenced_table_singular_id (user_id, product_id)
- Indexes: idx_table_column or uniq_table_column
- Boolean: Prefix with is_, has_, or can_ (is_active)

## 9. Appendix B: Common Pitfalls to Avoid

- Premature Optimization: Don't denormalize until you have performance metrics
- Ignoring Future Needs: Consider scalability from day one
- Inconsistent Data Types: Same data should have same type across tables
- Overusing Triggers: Prefer application logic when possible
- Neglecting Data Migration: Always plan for schema changes

## 10. Success Metrics

- Query performance benchmarks
- Ease of adding new features
- Reduced bugs related to data integrity
- Positive feedback from development team
- Minimal schema changes after production release



