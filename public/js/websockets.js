import config from './config.js'
import { log } from './log.js'
import { eventsDispatch } from './events.js'
import { timestamp } from './utils.js'

/**
 * @typedef {import("../../../server/types.js").WebsocketMessageType} WebsocketMessageType
 */

const logContext = 'WEBSOCKETS'

let wsIsStarted = false
let wsIsConnected = false
let socket = null
let reconnectTimer = null
let reconnectAttempts = 0
let pingInterval = null

// Configuration
const RECONNECT_CONFIG = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 1.5, // Exponential backoff
  maxAttempts: Infinity, // Unlimited retries (or set a number)
  pingInterval: 30000 // 30 seconds for ping
}

export function websocketsInit (token) {
  if (config.CONFIG_SERVER_WS_ENABLED && !wsIsStarted) {
    wsIsStarted = true
    log('WebSocket initialization started', logContext)
    websocketsConnect(token)
  }
}

/**
 * Tries to establish a WebSocket connection to the server.
 */
function websocketsConnect (token) {
  if (!token) {
    log('No token available, skipping connection', logContext, true)
    return
  }

  // Clean up existing connection if any
  // if (socket) {
  //   try {
  //     socket.close(1000, 'Reconnecting')
  //   } catch (e) {
  //     // Ignore errors during cleanup
  //   }
  //   socket = null
  // }

  // Clear any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  log(`Connecting to WebSocket URL ${config.CONFIG_SERVER_WS_ENDPOINT} (attempt ${reconnectAttempts + 1})...`, logContext)

  try {
    socket = new WebSocket(`${config.CONFIG_SERVER_WS_ENDPOINT}?token=${token}&ts=${timestamp()}`)

    /**
     * Handles the event when the WebSocket connection is successfully established.
     */
    socket.onopen = function () {
      wsIsConnected = true
      reconnectAttempts = 0
      log('WebSocket connected successfully', logContext)

      // Start ping interval
      startPingInterval(token)
    }

    /**
     * Listens for messages sent from the server.
     */
    socket.onmessage = function (event) {
      try {
        /** @type {WebsocketMessageType} */
        const message = JSON.parse(event.data)

        if (message.context === 'server-response' && message.data === 'pong') {
          log('Received pong message', logContext, false)
        } else if (message.context === 'client-reload') {
          window.location.reload()
        } else {
          eventsDispatch('websockets-message', message)
        }
      } catch (error) {
        log(`Error parsing message: ${error.message}`, logContext, true)
      }
    }

    /**
     * Handles WebSocket connection close.
     */
    socket.onclose = function (event) {
      wsIsConnected = false
      stopPingInterval()

      log(`Connection closed: code=${event.code}, reason=${event.reason}, wasClean=${event.wasClean}`,
        event.wasClean ? logContext : logContext + ' ERROR')

      // Don't reconnect for normal closures
      if (event.code !== 1000 && event.code !== 1001) {
        scheduleReconnect(token)
      }
    }

    /**
     * Handles WebSocket errors.
     */
    socket.onerror = function (error) {
      wsIsConnected = false
      log(`WebSocket error: ${error.message || 'Unknown error'}`, logContext, true)
      // Note: onclose will be called after onerror
    }
  } catch (error) {
    log(`Failed to create WebSocket: ${error.message}`, logContext, true)
    scheduleReconnect(token)
  }
}

/**
 * Schedules a reconnection attempt with exponential backoff.
 */
function scheduleReconnect (token) {
  // Check max attempts
  if (RECONNECT_CONFIG.maxAttempts !== Infinity &&
      reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
    log('Maximum reconnection attempts reached', logContext, true)
    return
  }

  // Calculate delay with exponential backoff
  const delay = Math.min(
    RECONNECT_CONFIG.initialDelay * Math.pow(RECONNECT_CONFIG.backoffFactor, reconnectAttempts),
    RECONNECT_CONFIG.maxDelay
  )

  log(`Scheduling reconnection in ${Math.round(delay / 1000)} seconds...`, logContext)

  reconnectTimer = setTimeout(() => {
    reconnectAttempts++
    websocketsConnect(token)
  }, delay)
}

/**
 * Starts the ping interval to keep connection alive.
 */
function startPingInterval (token) {
  stopPingInterval() // Clear any existing interval

  pingInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN && token) {
      try {
        socket.send(`ping:${token}`)
        log('Sent ping', logContext, false)
      } catch (error) {
        log(`Failed to send ping: ${error.message}`, logContext, true)
      }
    }
  }, RECONNECT_CONFIG.pingInterval)
}

/**
 * Stops the ping interval.
 */
function stopPingInterval () {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

/**
 * Manually disconnect the WebSocket.
 */
export function websocketsDisconnect () {
  wsIsConnected = false
  stopPingInterval()

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (socket) {
    try {
      socket.close(1000, 'Manual disconnect')
    } catch (e) {
      // Ignore errors
    }
    socket = null
  }

  log('WebSocket manually disconnected', logContext)
}

/**
 * Send data through WebSocket if connected.
 * @param {any} data
 */
export function websocketsSend (data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(typeof data === 'object' ? JSON.stringify(data) : data)
      return true
    } catch (error) {
      log(`Failed to send data: ${error.message}`, logContext, true)
      return false
    }
  } else {
    log('Cannot send - WebSocket not connected', logContext, true)
    return false
  }
}

/**
 * Check if WebSocket is connected.
 */
export function isWebsocketConnected () {
  return wsIsConnected && socket && socket.readyState === WebSocket.OPEN
}

// import config from './config.js'
// import { log } from './log.js'
// import { eventsDispatch } from './events.js'
// import { timestamp } from './utils.js'
// import { backendGetToken } from './backend.js'

// /**
//  * @typedef {import("../../../server/types.js").WebsocketMessageType} WebsocketMessageType
//  */

// const websocketsIntervalSecs = 2

// const logContext = 'WEBSOCKETS'

// let wsIsStarted = false
// let wsIsConnected = false

// export function websocketsInit () {
//   if (config.CONFIG_SERVER_WS_ENABLED) {
//     if (!wsIsStarted) {
//       wsIsStarted = true

//       setInterval(() => {
//         websocketsConnect()
//       }, websocketsIntervalSecs * 1000)
//     } else {
//       log('Already started', logContext, true)
//     }
//   }
// }

// let socket = null

// let counter = 0

// /**
//  * Tries to establish a WebSocket connection to the server.
//  *
//  * If the connection is already open, it sends a ping message with the token.
//  * If the connection is not open and a token is available, it creates a new WebSocket connection.
//  *
//  * @return {void}
//  */
// function websocketsConnect () {
//   counter++

//   const token = backendGetToken()

//   // Pings the server every (30 * websocketsIntervalSecs) seconds
//   if (wsIsConnected && token && socket.readyState === 1 && counter % 30 === 0) {
//     socket.send(`ping:${token}`)
//   }

//   if (!wsIsConnected && token) {
//     socket = new WebSocket(`${config.CONFIG_SERVER_WS_ENDPOINT}?token=${token}&ts=${timestamp()}`)

//     /**
//          * Handles the event when the WebSocket connection is successfully established.
//          * Sets the wsIsConnected flag to true and logs a message indicating the connection status.
//          */
//     socket.onopen = function () {
//       wsIsConnected = true

//       log('Connected', logContext)
//     }

//     /**
//          * Listens for messages sent from the server and dispatches a custom event with the parsed JSON data.
//          *
//          * @param {MessageEvent} event - The received message event.
//          *
//          * @listens MessageEvent
//          */
//     socket.onmessage = function (event) {
//       try {
//         /** @type {WebsocketMessageType} */
//         const message = JSON.parse(event.data)

//         if (message.context === 'server-response' && message.data === 'pong') {
//           log('Received pong message', logContext, false)
//         } else if (message.context === 'client-reload') {
//           window.location.reload()
//         } else {
//           eventsDispatch('websockets-message', message)
//         }
//       } catch (error) {
//         log(error.message, logContext, true)
//       }
//     }

//     /**
//          * Listens for the WebSocket connection close event.
//          *
//          * @param {CloseEvent} event - The close event.
//          *
//          * @listens CloseEvent
//          */
//     socket.onclose = function (event) {
//       wsIsConnected = false

//       if (event.wasClean) {
//         log(`Connection closed, code=${event.code} reason=${event.reason}`, logContext)
//       } else {
//         log('Connection closed', logContext, true)
//       }
//     }

//     /**
//          * Handles the error event for the WebSocket connection.
//          * Sets the wsIsConnected flag to false when an error occurs.
//          *
//          * @listens ErrorEvent
//          */
//     socket.onerror = function () {
//       wsIsConnected = false
//     }
//   }
// }
