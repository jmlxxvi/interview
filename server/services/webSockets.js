import { sessionRepository } from '../repositories/auth/session.js'
import { websocketsSend } from '../web/websockets.js'

const sendMessageToSession = async (entityId, plantId, token, message) => {
  const session = await sessionRepository.findByToken(entityId, plantId, token)

  if (session) {
    websocketsSend(session.sessionToken, message)
  }
}

const broadcastMessage = async (entityId, plantId, message, excludeToken) => {
  console.log('excludeToken: ', excludeToken)
  const sessions = await sessionRepository.findAll(entityId, plantId)

  for (const session of sessions) {
    // Implement the logic to send the message to each session
    if (session.sessionToken !== excludeToken) {
      websocketsSend(session.sessionToken, message)
    }
  }
}

export const webSocketsService = {
  broadcastMessage,
  sendMessageToSession
}
