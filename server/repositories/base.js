import { db } from '../platform/db/index.js'
import { keysToSnake } from '../utils/index.js'
// import { Result } from '../utils/result.js'

// Supported operators mapping
const operators = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $in: 'IN',
  $nin: 'NOT IN',
  $like: 'LIKE',
  $ilike: 'ILIKE',
  $is: 'IS',
  $isnot: 'IS NOT'
}

// Generic CRUD operations
export const createBaseRepository = (tableName) => {
  // const commit = async (client) => {
  //   const resultDb = await db.query('commit', [], client)

  //   return resultDb
  // }

  // const rollback = async (client) => {
  //   const resultDb = await db.query('rollback', [], client)

  //   return resultDb
  // }

  // Helper function to build WHERE clause from conditions
  const buildWhereClause = (conditions) => {
    const whereParts = []
    const values = []
    let paramCount = 1

    for (const [field, condition] of Object.entries(conditions)) {
      if (typeof condition === 'object' && condition !== null && condition.$expr) {
        // Handle custom SQL expressions: { email: { $expr: 'LOWER(email) = LOWER($1)', values: ['test@example.com'] } }
        whereParts.push(condition.$expr.replace(/\$1/g, `$${paramCount}`))
        values.push(...condition.values)
        paramCount += condition.values.length
      } else if (typeof condition === 'object' && condition !== null) {
        // Handle operator syntax: { age: { $gte: 25 } }
        for (const [operator, value] of Object.entries(condition)) {
          if (operators[operator]) {
            if (operator === '$in' || operator === '$nin') {
              // Handle IN/NOT IN operators
              const placeholders = value.map((_, index) => `$${paramCount + index}`).join(', ')
              whereParts.push(`${field} ${operators[operator]} (${placeholders})`)
              values.push(...value)
              paramCount += value.length
            } else {
              // Handle other operators
              whereParts.push(`${field} ${operators[operator]} $${paramCount}`)
              values.push(value)
              paramCount++
            }
          }
        }
      } else {
        // Handle simple equality: { name: 'John' }
        whereParts.push(`${field} = $${paramCount}`)
        values.push(condition)
        paramCount++
      }
    }

    return {
      whereClause: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '',
      values
    }
  }

  const findAll = async (client) => {
    const resultDb = await db.query(`SELECT * FROM ${tableName}`, [], client)

    return resultDb
  }

  // Find by ID
  const findById = async (id, client) => {
    const resultDb = await db.row(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [id],
      client
    )

    return resultDb
  }

  // Create new record
  const create = async (data, client) => {
    const dbData = keysToSnake(data)
    const keys = Object.keys(dbData)
    const values = Object.values(dbData)
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')

    const resultDb = await db.query(
      `INSERT INTO ${tableName} (${keys.join(', ')})
       VALUES (${placeholders})`,
      values,
      client
    )

    return resultDb
  }

  // Update record
  const update = async (id, data, client) => {
    const dbData = keysToSnake(data)
    const keys = Object.keys(dbData)
    const values = Object.values(dbData)
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ')

    const resultDb = await db.query(
      `UPDATE ${tableName}
      SET ${setClause}
      WHERE id = $${keys.length + 1}`,
      [...values, id],
      client
    )

    return resultDb
  }

  // Delete record
  const deleteById = async (context, entityId, plantId, id, client) => {
    const resultDb = await db.query(
      `DELETE FROM ${tableName} WHERE id = $1 AND entity_id = $2 AND plant_id = $3`,
      [id, entityId, plantId],
      client
    )

    return resultDb
  }

  // Find with conditions
  // Find with advanced conditions
  const find = async (conditions = {}, options = {}, client) => {
    const { whereClause, values } = buildWhereClause(conditions)

    let sql = `SELECT * FROM ${tableName} ${whereClause}`

    // Add ORDER BY if provided
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`
    }

    // Add LIMIT and OFFSET if provided
    if (options.limit) {
      sql += ` LIMIT $${values.length + 1}`
      values.push(options.limit)
    }

    if (options.offset) {
      sql += ` OFFSET $${values.length + 1}`
      values.push(options.offset)
    }

    const resultDb = await db.query(sql, values, client)

    return resultDb
  }

  // Find one record with conditions
  const findOne = async (conditions = {}, client) => {
    const findResult = await find(conditions, client)

    return findResult.rows[0] || null
  }
  // Pagination
  const findWithPagination = async (page = 1, limit = 10, conditions = {}, client) => {
    const offset = (page - 1) * limit
    const keys = Object.keys(conditions)
    const values = Object.values(conditions)

    let whereClause = ''
    let queryParams = []

    if (keys.length > 0) {
      whereClause = `WHERE ${keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ')}`
      queryParams = [...values, limit, offset]
    } else {
      queryParams = [limit, offset]
    }

    const resultDb = await db.query(
      `SELECT * FROM ${tableName}
       ${whereClause}
       LIMIT $${keys.length + 1} OFFSET $${keys.length + 2}`,
      queryParams,
      client
    )

    return resultDb
  }

  // Count records
  // Count records with conditions
  const count = async (conditions = {}, client) => {
    const { whereClause, values } = buildWhereClause(conditions)

    const sql = `SELECT COUNT(*) FROM ${tableName} ${whereClause}`
    const result = await db.query(sql, values, client)
    return parseInt(result.rows[0].count)
  }

  const toggleBooleanField = async (id, field, client) => {
    const sql = `UPDATE ${tableName} SET ${field} = NOT ${field} WHERE id = $1`
    const resultDb = await db.query(sql, [id], client)

    return resultDb
  }

  const lookup = async (columnName, idName = 'id', client) => {
    const sql = `select ${idName} as key, ${columnName} as value from ${tableName}`
    const resultDb = await db.query(sql, [], client)

    return resultDb
  }

  return {
    findAll,
    findById,
    create,
    update,
    deleteById,
    find,
    findOne,
    findWithPagination,
    count,
    toggleBooleanField,
    lookup,
    tableName
  }
}

/*
Examples of usage:

// examples/advancedQueryExamples.js
import { userRepository } from '../repositories/userRepository.js';
import { productRepository } from '../repositories/productRepository.js';

const advancedQueryExamples = async () => {
  console.log('=== Advanced Query Examples ===\n');

  // 1. Comparison operators
  console.log('1. Users aged 25 or older:');
  const adults = await userRepository.find({
    age: { $gte: 25 }
  });
  console.log(adults);

  // 2. Multiple conditions with different operators
  console.log('\n2. Active users under 30:');
  const youngActiveUsers = await userRepository.find({
    is_active: true,
    age: { $lt: 30 }
  });
  console.log(youngActiveUsers);

  // 3. IN operator
  console.log('\n3. Users with specific ages:');
  const specificAges = await userRepository.find({
    age: { $in: [25, 30, 35] }
  });
  console.log(specificAges);

  // 4. NOT EQUAL operator
  console.log('\n4. Inactive users:');
  const inactiveUsers = await userRepository.find({
    is_active: { $ne: true }
  });
  console.log(inactiveUsers);

  // 5. LIKE/ILIKE operators for text search
  console.log('\n5. Users with "john" in email (case insensitive):');
  const johnUsers = await userRepository.find({
    email: { $ilike: '%john%' }
  });
  console.log(johnUsers);

  // 6. NULL checks
  console.log('\n6. Users without last login:');
  const noLastLogin = await userRepository.find({
    last_login: { $is: null }
  });
  console.log(noLastLogin);

  // 7. Complex product queries
  console.log('\n7. Products between $50 and $200:');
  const midRangeProducts = await productRepository.find({
    price: { $gte: 50, $lte: 200 }
  });
  console.log(midRangeProducts);

  // 8. NOT IN operator
  console.log('\n8. Products not in specific categories:');
  const excludedProducts = await productRepository.find({
    category: { $nin: ['electronics', 'furniture'] }
  });
  console.log(excludedProducts);

  // 9. Combining with options
  console.log('\n9. First 5 active users ordered by name:');
  const firstFive = await userRepository.find(
    { is_active: true },
    {
      orderBy: 'name ASC',
      limit: 5
    }
  );
  console.log(firstFive);

  // 10. Count with conditions
  console.log('\n10. Count of premium users:');
  const premiumCount = await userRepository.count({
    is_premium: true,
    age: { $gte: 18 }
  });
  console.log(`Premium users count: ${premiumCount}`);

  // 11. Check existence
  console.log('\n11. Check if admin user exists:');
  const adminExists = await userRepository.exists({
    role: 'admin',
    is_active: true
  });
  console.log(`Admin exists: ${adminExists}`);
};

// Run the examples
advancedQueryExamples().catch(console.error);

// repositories/productRepository.js
import { createBaseRepository } from './baseRepository.js';
import { query, pool } from '../config/database.js';

const productBaseRepo = createBaseRepository('products');

// Custom product methods
export const findProductsInStock = async (client = null) => {
  return await productBaseRepo.find({
    stock: { $gt: 0 }
  }, {}, client);
};

export const findExpensiveProducts = async (minPrice = 100, client = null) => {
  return await productBaseRepo.find({
    price: { $gte: minPrice }
  }, { orderBy: 'price DESC' }, client);
};

export const findProductsByCategoryAndPrice = async (category, maxPrice, client = null) => {
  return await productBaseRepo.find({
    category: category,
    price: { $lte: maxPrice }
  }, { orderBy: 'price ASC' }, client);
};

export const productRepository = {
  ...productBaseRepo,
  findProductsInStock,
  findExpensiveProducts,
  findProductsByCategoryAndPrice
};

// services/userService.js
import { userRepository } from '../repositories/userRepository.js';

export const findEligibleUsersForPromotion = async () => {
  return await userRepository.find({
    is_active: true,
    age: { $gte: 18, $lte: 65 },
    last_login: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // last 30 days
  }, {
    orderBy: 'created_at DESC'
  });
};

export const findInactiveUsers = async (inactiveDays = 90) => {
  const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

  return await userRepository.find({
    last_login: { $lt: cutoffDate },
    is_active: true
  });
};

export const getUserStats = async () => {
  const [total, active, premium, recent] = await Promise.all([
    userRepository.count(),
    userRepository.count({ is_active: true }),
    userRepository.count({ is_premium: true }),
    userRepository.count({
      created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
  ]);

  return {
    total,
    active,
    premium,
    recent,
    inactive: total - active
  };
};
// examples/camelCaseExamples.js
import { userRepository } from '../repositories/userRepository.js';

const camelCaseExamples = async () => {
  console.log('=== CamelCase Transformation Examples ===\n');

  // Database has columns: id, user_name, email_address, is_active, created_at

  // CREATE - Use camelCase input
  const newUser = await userRepository.create({
    userName: 'john_doe',        // camelCase
    emailAddress: 'john@example.com', // camelCase
    isActive: true               // camelCase
  });

  console.log('Created user (camelCase output):', newUser);
  // Returns: { id: 1, userName: 'john_doe', emailAddress: 'john@example.com', isActive: true, createdAt: '2023-01-01...' }

  // FIND BY ID - Returns camelCase
  const user = await userRepository.findById(newUser.id);
  console.log('Found user:', user);

  // FIND ALL - Returns camelCase
  const allUsers = await userRepository.findAll();
  console.log('All users:', allUsers);

  // UPDATE - Use camelCase input
  const updatedUser = await userRepository.update(newUser.id, {
    userName: 'john_smith' // camelCase
  });
  console.log('Updated user:', updatedUser);

  // FIND WITH CONDITIONS - Use actual database column names in conditions
  const activeUsers = await userRepository.find({
    is_active: true // Use snake_case for conditions (database column names)
  });
  console.log('Active users:', activeUsers);

  // Complex query with camelCase output
  const recentUsers = await userRepository.find({
    is_active: true,
    created_at: { $gte: new Date('2023-01-01') }
  }, {
    orderBy: 'created_at DESC',
    limit: 5
  });
  console.log('Recent active users:', recentUsers);
};

// Run examples
camelCaseExamples().catch(console.error);
*/
