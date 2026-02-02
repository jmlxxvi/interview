import path from 'node:path'

import express from 'express'

import config from '../config.js'
import log from '../platform/log.js'
import session from '../platform/session.js'
import { stringEnd, timestamp, uuid } from '../utils/index.js'
// import { checkPermissionsByName } from '../platform/security.js'
// import { i18nGetLabel } from '../platform/i18n/index.js'
// import { db } from "../platform/db";

export const router = express.Router()

function parseCookies (httpHeaders) {
  const header = httpHeaders && httpHeaders.cookie

  if (header) {
    return Object.fromEntries(header.split(';').map((cookie) => cookie.trim().split('=')))
  } else {
    return {}
  }
}

export const execute = async (params, context) => {
  const startTime = timestamp(true)

  const mod = params.mod ?? 'unknown'
  const fun = params.fun ?? 'unknown'

  try {
    let elapsed = -1

    // TODO implement input validation
    const inputValidation = { success: true, message: '' }

    if (inputValidation.success) {
      log.trace(`Remote IP is ${context.remoteIp}`, 'server/execute', context.execId)

      const { args } = params

      context.app = mod.split('/').at(0) || ''

      const results = await verify({
        mod,
        fun,
        args,
        context
      })

      elapsed = timestamp(true) - startTime

      results.origin = `${mod}:${fun}`

      results.status = {
        timestamp: timestamp(true),
        elapsed,
        exec_id: context.execId,
        executor: context.executor,
        ...results.status
      }

      // TODO implement output validation
      const outputValidation = { success: true, message: '' }

      if (outputValidation.success) {
        log.debug(`👍 Server executed ${results.origin} => ${results.status.code} in ${elapsed}ms`, 'server/execute', context.execId)

        return results
      } else {
        const elapsed = timestamp(true) - startTime

        const results = {
          origin: `${mod}:${fun}`,
          status: {
            error: true,
            code: 1100, // TODO use a code for failed validations
            message: config.security.hide_server_errors ? config.security.server_error_message : `Output validation error: ${outputValidation.message}`,
            timestamp: timestamp(true),
            elapsed,
            exec_id: context.execId,
            executor: context.executor
          },
          data: null
        }

        log.error(`Output validation error for ${results.origin}`, 'server/run', context.execId)

        return results
      }
    } else {
      const results = {
        origin: `${mod}:${fun}`,
        status: {
          error: true,
          code: 1040,
          message: config.security.hide_server_errors ? config.security.server_error_message : `Input validation error: ${inputValidation.message}`,
          timestamp: timestamp(true),
          elapsed,
          exec_id: context.execId,
          executor: context.executor
        },
        data: null
      }

      return results
    }
  } catch (error) {
    log.error(error, 'server/execute', context.execId)

    const elapsed = timestamp(true) - startTime

    let code = 1100
    let message = error.message

    if (error.message === 'ZombiServerTimeoutError') {
      code = 1012
      message = 'Timeout'
    }

    const results = {
      origin: `${mod}:${fun}`,
      status: {
        error: true,
        code,
        message: config.security.hide_server_errors ? config.security.server_error_message : message,
        timestamp: timestamp(true),
        elapsed,
        exec_id: context.execId,
        executor: context.executor
      },
      data: null
    }

    return results
  }
}

const verify = async ({ mod, fun, args, context }) => {
  log.debug(`⚡️ Executing ${mod}:${fun} with token ${context.token ? stringEnd(context.token) : 'NONE'}`, 'server/execute', context.execId)

  if (config.environment === 'development') {
    log.debug(`Arguments: ${args ? JSON.stringify(args) : 'none'}`, 'server/execute', context.execId)
  }

  // const app = mod.split("/").at(0) || "";

  if (mod.split('/').at(-1) === 'public') {
    log.trace(`Module ${mod} is public`, 'server/execute', context.execId)

    return run({ mod, fun, args, context })
  }

  if (!context.token) {
    log.debug('Token not sent', 'server/execute', context.execId)

    return {
      status: {
        error: true,
        code: 1002,
        message: 'codes.message(1002)'
      },
      data: null
    }
  }

  log.debug(`Using token ${stringEnd(context.token)}`, 'server/execute', context.execId)

  if (!await session.check(context.token)) {
    log.debug('Invalid session', 'server/execute', context.execId)

    return {
      status: {
        error: true,
        code: 1002,
        message: 'Invalid session'
      },
      data: null
    }
  }

  if (context.session.user_id && context.session.username) {
    log.debug(`User with id ${context.session.user_id} is ${context.session.username}`, 'server/exectue', context.execId)
  }

  // verify permissions
  // const isStart = mod === "auth/start" && fun === "start";
  // const isStart = fun === "start";

  // if (!isStart && (!await checkPermissionsByName(context, fun, mod, "API"))) {

  //     return {
  //         status: {
  //             error: true,
  //             code: 1500,
  //             message: i18nGetLabel(context.session.language_code, "PERMISSION_DENIED"),
  //         },
  //         data: null,
  //     };

  // }

  return run({ mod, fun, args, context })
}

const run = async ({ mod, fun, args, context }) => {
  const modulePath = path.join(import.meta.dirname, '..', `api/${mod}/api.js`)

  const action = await import(modulePath)

  if (typeof action[fun] === 'function') {
    const results = await action[fun](args, context)

    return {
      status: {
        error: results.error,
        code: results.code,
        message: results.message ?? 'ok'
      },
      data: results.data
    }
  } else {
    log.error(`[${mod}:${fun}] is not defined`, 'server/run', context.execId)

    return {
      status: {
        error: true,
        code: 1003,
        message: `Function ${mod}:${fun} is not defined`
      },
      data: null
    }
  }
}

export async function saveExecuteResponse (source, response) {
  try {

    // TODO implement drain for this data

  } catch (error) {
    log.error(`${source}: ${error.message}`, 'server/saveExecuteResponse', response.status.exec_id || 'none')
  }
}

// API
router.post('/api', async (req, res) => {
  const headers = req.headers
  const cookies = parseCookies(headers)
  const execId = req.body?.exec_id || req.body?.execId || req.query?.exec_id || req.query?.execId || uuid()
  const token = cookies[config.security.tokenKey] || null
  const params = req.body
  const remoteIps = headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0'

  const remoteIp = Array.isArray(remoteIps) ? remoteIps[0] : remoteIps

  const sessionData = await session.getAll(token)
  console.log('sessionData: ', sessionData)

  const context = {
    source: 'http',
    token,
    execId,
    remoteIp,
    headers,
    cookies: {
      set: res.cookie.bind(res),
      clear: res.clearCookie.bind(res),
      ...cookies
    },
    session: sessionData
  }

  console.log(JSON.stringify({ context }, null, 2))
  const response = await execute(params, context)
  res.json(response)

  // try {
  //   const response = await execute(params, context)
  //   res.json(response)
  // } catch (error) {
  //   log.error(`Error getting session data: ${error.message}`, 'server/api', context.execId)
  //   res.json({
  //     status: {
  //       error: true,
  //       code: error.code || 5000,
  //       message: config.security.hide_server_errors ? config.security.server_error_message : error.message,
  //       timestamp: timestamp(true),
  //       exec_id: context.execId,
  //       executor: context.executor
  //     },
  //     data: null
  //   })
  // }
})
