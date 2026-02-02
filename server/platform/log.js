import config from '../config.js'
import { uuid, dateFormat } from '../utils/index.js'

const appLogLevel = config.log.level || 'DEBUG'

const errorLevels = {
  DISABLED: 0,
  ERROR: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
}

let logUuid = uuid()

/**
 * Sets the global logging UUID.
 * @param {string} uuid The UUID to set as the current logging UUID.
 */
const setUuid = (uuid) => {
  logUuid = uuid
}
const getUuid = () => logUuid

/**
 * Given a log level, returns a string label for that level.
 * @param {number} level A log level as specified in errorLevels.
 * @returns {string} A string label for the given log level.
 */
const errorType = (level) => {
  let errorTypeLabel

  switch (level) {
    case -1: errorTypeLabel = 'INFO '; break
    case 1: errorTypeLabel = 'ERROR'; break
    case 2: errorTypeLabel = 'INFO '; break
    case 3: errorTypeLabel = 'DEBUG'; break
    case 4: errorTypeLabel = 'TRACE'; break
    default: errorTypeLabel = 'NONE '; break
  }

  return errorTypeLabel
}

/**
 * Returns an icon representing the log level severity.
 * @param {number} level A log level as specified in errorLevels.
 * @returns {string} A string containing an icon that represents the given log level.
 */
const errorIcon = (level) => {
  let logIcon = ''

  switch (level) {
    case 1: logIcon = '🔴'; break
    case 2: logIcon = '🟢'; break
    case 3: logIcon = '🔵'; break
    case 4: logIcon = '🟣'; break
    default: logIcon = '🟢'; break
  }
  logIcon += ' '

  return logIcon
}

const _log = async (message, subject = 'UNKNOWN', level, execId) => {
  if (level === -1 || errorLevels[appLogLevel] >= level) {
    const rid = execId || logUuid

    const messageTimestamp = dateFormat(new Date(), '%Y-%m-%d %H:%M:%S.%x', true)

    let msg

    if (typeof message === 'string') {
      msg = message
    } else if (message instanceof Error) {
      msg = message.message + ' ' + message.stack || ''
    } else { msg = `Incorrect message type "${typeof message}" for logging` }

    const errorTypeConsole = errorType(level)

    const errorIconConsole = errorIcon(level)

    const m = `${errorIconConsole}${errorTypeConsole} ${messageTimestamp} [${rid}] [${subject}] ${msg}`
    // const m = `${errorIconConsole}${errorTypeConsole} ${messageTimestamp} [${rid}] [${subject}] ${msg.replace(/(?:\r\n|\r|\n)/g, '')}`

    console.log(m)
  }
}

/**
 * Logs a message, regardless of the log level.
 * @param {string} message The message to log
 * @param {string} [subject] The subject of the message. Defaults to "UNKNOWN"
 * @param {string} [execId] The execution id of the message. Defaults to the logUuid
 */
const always = (message, subject, execId) => {
  _log(message, subject, -1, execId)
}

const error = (message, subject, execId) => {
  _log(message, subject, 1, execId)
}

/**
 * Logs an info message. The message is only displayed if the log level is set to "INFO"
 * or lower.
 * @param {string} message The message to log
 * @param {string} [subject] The subject of the message. Defaults to "UNKNOWN"
 * @param {string} [execId] The execution id of the message. Defaults to the logUuid
 */
const info = (message, subject, execId) => {
  _log(message, subject, 2, execId)
}

/**
 * Logs a debug message. The message is only displayed if the log level is set to "DEBUG"
 * or lower.
 * @param {string} message The message to log
 * @param {string} [subject] The subject of the message. Defaults to "UNKNOWN"
 * @param {string} [execId] The execution id of the message. Defaults to the logUuid
 */
const debug = (message, subject, execId) => {
  _log(message, subject, 3, execId)
}

/**
 * Logs a trace message. The message is only displayed if the log level is set to "TRACE"
 * or lower.
 * @param {string} message The message to log
 * @param {string} [subject] The subject of the message. Defaults to "UNKNOWN"
 * @param {string} [execId] The execution id of the message. Defaults to the logUuid
 */
const trace = (message, subject, execId) => {
  _log(message, subject, 4, execId)
}

export default {
  always,
  error,
  info,
  debug,
  trace,
  setUuid,
  getUuid
}
