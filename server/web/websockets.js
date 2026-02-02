import url from 'node:url'
// import http from 'node:http'

import { WebSocketServer } from 'ws'

import log from '../platform/log.js'
import { timestamp } from '../utils/index.js'
import config from '../config.js'

/**
 * @typedef {import("../types.js").WebsocketMessageType} WebsocketMessageType
 */

const websocketsClients = new Map()

/**
 * Send data to a WebSocket client identified by the provided token.
 *
 * @param {string} token - The token used to identify the WebSocket client.
 * @param {WebsocketMessageType} data - The data to be sent to the WebSocket client.
 */
export function websocketsSend (token, data) {
  const client = websocketsClients.get(token)
  if (client) {
    client.socket.send(JSON.stringify(data))
  } else {
    log.debug(`No WS client found for token: ${token}`, 'websocketsSend')
  }
}

/**
 * Initializes the WebSocket server and handles client connections.
 *
 * @param {http.Server} server - The HTTP server instance to attach the WebSocket server to.
 *
 * On a new connection, extracts the token from the query parameters and stores the WebSocket client
 * with the corresponding token in a map. Handles incoming messages and sends responses back to the client.
 * Logs messages for connection, received data, and disconnection events.
 */
export function websocketsInit (server) {
  log.info('Initializing WebSocket server', 'websocketsInit')

  // Websocket Server
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws, req) => {
    // Parse the URL to extract query parameters
    const parameters = url.parse(req.url, true).query

    let token = parameters.token

    if (Array.isArray(token)) {
      token = token[0]
    }

    let sequence = parameters.sequence

    if (Array.isArray(sequence)) {
      sequence = sequence[0]
    }

    log.debug(`New WebSocket connection from token: ...${token.slice(-8)}`, 'websockets/connection')

    websocketsClients.set(token, { socket: ws, timestamp: timestamp() })

    ws.on('message', (/** @type {string} */message) => {
      log.debug(`Message from client: ${message}`, 'websockets/message')

      if (typeof message === 'string') {
        const [ping, token] = message.split(':')

        if (ping === 'ping') {
          const client = websocketsClients.get(token)

          if (client) {
            client.timestamp = timestamp()
          }

          websocketsSend(token, {
            context: 'server-response', data: 'pong'
          })
        }
      }
    })

    ws.on('close', () => {
      log.debug(`WebSocket connection closed for token: ...${token.slice(-8)}`, 'websockets/close')
      websocketsClients.delete(token)
    })
  })
}

export function websocketsPurge () {
  log.debug(`Purging stale connections on ${websocketsClients.size} entries`, 'websockets/purge')

  for (const [token, client] of websocketsClients.entries()) {
    if ((timestamp() - client.timestamp) > config.websockets.lifetime * 1000) {
      log.debug(`Deleting stale connection for token: ${token.slice(-8)}`, 'websockets/purge')
      websocketsClients.delete(token)
    }
  }
}
