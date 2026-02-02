import log from '../../../platform/log.js'

export default async function (execId, payload) {
  log.info(`Processing cron handler with payload: ${JSON.stringify(payload)}`, 'jobs/handlers/tests/cron-handler', execId)
  // Heavy lifting here...
}
