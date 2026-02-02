import log from '../platform/log.js'
// import { ApiAuthenticationError } from '../api/errors.js'
import { Result } from '../utils/result.js'

import { rbacRepository } from '../repositories/rbac.js'

async function getUserAuthorization (context, userId) {
  const permissionsResult = await rbacRepository.getUserPermissions(context, userId)

  const permissions = permissionsResult.map(row => ({
    permission: `${row.resource}:${row.action}`,
    resource: row.resource,
    action: row.action
  }))

  const rolesResult = await rbacRepository.getUserRoles(context, userId)

  return Result.ok({ permissions, roles: rolesResult })
}

// TODO refactor the functions below to return Result types or move it to another layer
async function checkUserIsAdmin (context, userId) {
  const roles = await rbacRepository.getUserRoles(context, userId, 'admin')

  const isAdmin = roles.length > 0

  return isAdmin
}

async function checkSessionUserIsAdmin (context) {
  const { userIsAdmin } = context.session
  return userIsAdmin
}

async function getSessionRoles (context) {
  const sessionRoles = context.session.roles || []
  log.debug('sessionRoles: ', sessionRoles, context.execId)

  return sessionRoles
}

async function getSessionPermissions (context) {
  const sessionPermissions = context.session.permissions || []
  log.debug('sessionPermissions: ' + sessionPermissions, context.execId)

  return sessionPermissions
}

async function checkSessionPermissions (context, requiredPerm, throwOnUnauthorized = false) {
  const sessionPermissions = await getSessionPermissions(context)
  const isAuthorized = sessionPermissions.includes(requiredPerm)

  if (throwOnUnauthorized && !isAuthorized) {
    log.debug(`User [${context.session.userId}] unauthorized for [${requiredPerm}]`, 'auth/public:checkSessionPermission', context.execId)
    throw new Error('Not authorized')
  }

  return isAuthorized
}

export const securityService = {
  checkSessionUserIsAdmin,
  getUserAuthorization,
  checkUserIsAdmin,
  getSessionRoles,
  getSessionPermissions,
  checkSessionPermissions
}
