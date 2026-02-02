import { db } from '../platform/db/index.js'
// import log from '../platform/log.js'
// import { Result } from '../utils/result.js'
// import { keysToCamel, keysToSnake } from '../utils.js'

import { createBaseRepository } from './base.js'

const baseRepository = createBaseRepository('interview.user')

// Users
const usersLookup = async (client = null) => {
  const result = await db.query(
    'SELECT id as key, full_name as value from interview.user order by full_name',
    [],
    client
  )
  return result
}

// Roles
const rolesLookup = async (client = null) => {
  const result = await db.query(
    'SELECT id as key, name as value from interview.roles order by name',
    [],
    client
  )
  return result
}

const getUserPermissions = async (context, userId, client = null) => {
  const permissionsQuery = `
        SELECT p.resource, p.action
        FROM interview.permission p
        JOIN interview.role_permission rp ON rp.permission_id = p.id
        JOIN interview.user_role ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = $1;
      `
  const permissionsResult = await db.query(permissionsQuery, [userId], client)

  return permissionsResult
}

const getUserRoles = async (context, userId, roleName = null, client = null) => {
  console.log('userId, roleName: ', userId, roleName)
  const bind = [userId]

  let rolesQuery = `
      SELECT r.id, r.name, r.description
      FROM interview.user_role ur
      JOIN interview.role r ON ur.role_id = r.id
      WHERE ur.user_id = $1`

  if (roleName) {
    rolesQuery += ' AND r.name = $2'
    bind.push(roleName)
  }

  console.log('rolesQuery: ', rolesQuery)
  const rolesResult = await db.query(rolesQuery, bind, client = null)
  console.log('rolesResult: ', rolesResult)

  return rolesResult
}

// Permissions

const getRolePermissions = async (context, roleId, client = null) => {
  const permissionsQuery = `
        SELECT p.id, p.name
        FROM interview.permission p
        JOIN interview.role_permission rp ON rp.permission_id = p.id
        WHERE rp.role_id = $1;
      `
  const permissionsResult = await db.query(permissionsQuery, [roleId], client)

  return permissionsResult
}

const getRoleUsers = async (context, roleId, client = null) => {
  const usersQuery = `
        SELECT u.id, u.username, u.email
        FROM interview.user u
        JOIN interview.user_role ur ON ur.user_id = u.id
        WHERE ur.role_id = $1;
      `
  const usersResult = await db.query(usersQuery, [roleId], client)

  return usersResult
}

export const rbacRepository = {
  // Base operations
  ...baseRepository,
  usersLookup,
  rolesLookup,
  getUserPermissions,
  getUserRoles,
  getRolePermissions,
  getRoleUsers
}
