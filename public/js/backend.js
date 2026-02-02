import config from './config.js'
import { log } from './log.js'

import { eventsDispatch } from './events.js'

const logContext = 'BACKEND'

export async function backendRpc (
  mod,
  fun,
  args,
  headers
) {
  try {
    eventsDispatch('event-rpc-call-start')

    // TODO check if mod and fun are not null/undefined
    const params = { mod, fun, args }

    if (config.CONFIG_DEBUG) {
      log(JSON.stringify(params, null, 2), logContext)
    }

    const response = await fetch(`${config.CONFIG_BACKEND_URL}/api`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },

      body: JSON.stringify(params)
    })

    if (response.ok) {
      const responseJson = await response.json()

      if (config.CONFIG_DEBUG) {
        log(JSON.stringify(responseJson, null, 2), logContext, responseJson.status?.error)
      }

      eventsDispatch('event-rpc-call-end', responseJson)

      return responseJson
    } else {
      const data = {
        status: {
          timestamp: null,
          elapsed: -1,
          request_id: null,
          executor: null,
          error: true,
          code: response.status,
          message: response.statusText
        },
        data: null,
        origin: `${mod}:${fun}`
      }

      eventsDispatch('event-rpc-call-end', data)

      return data
    }
  } catch (error) {
    const data = {
      status: {
        timestamp: null,
        elapsed: -1,
        request_id: null,
        executor: null,
        error: true,
        code: 600,
        message: 'Unknown error: ' + error.message
      },
      data: null,
      origin: `${mod}:${fun}`
    }

    eventsDispatch('event-rpc-call-end', data)

    return data
  }
};
