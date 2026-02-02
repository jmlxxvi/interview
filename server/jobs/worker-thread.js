import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { threadId, workerData } from 'node:worker_threads'

import { db } from '../platform/db/index.js'
import log from '../platform/log.js'
import { timestamp } from '../utils/index.js'
import { sendSupportEmail } from '../platform/services/email/utils.js'

// Access the identifiers
const { workerIndex, execId } = workerData

log.info(`Thread ${threadId} / Worker ${workerIndex} initializing...`, 'jobs/worker-thread', execId)

// Helper to handle paths in ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HANDLERS_DIR = path.join(__dirname, 'handlers')

await db.connect(execId)

/**
 * Picks up the next available job
 */
async function getNextJob () {
  const now = timestamp()
  const query = `
    UPDATE jobs.jobs
    SET status = 'RUNNING',
        locked_at = $1,
        attempts = attempts + 1
    WHERE id = (
      SELECT id FROM jobs.jobs
      WHERE 1=1
        AND status = 'PENDING'
        AND run_at <= $1
      ORDER BY priority DESC, run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `

  return db.dml(query, [now])
}

export async function startWorker (pollInterval = 1000) {
  while (true) {
    const job = await getNextJob() // uses the getNextJob logic from previous steps

    if (job.affectedRows === 0) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      continue
    }

    const startTime = timestamp()

    try {
      // Dynamic Import
      const modulePath = path.join(HANDLERS_DIR, job.handler)

      // We add a cache-buster or use the absolute path
      const { default: handler } = await import(`file://${modulePath}`)

      if (typeof handler !== 'function') {
        throw new Error(`Handler ${job.handler} does not have a default export function`)
      }

      await handler(execId, job.payload)

      const elapsedTime = timestamp() - startTime

      await db.query(`
        UPDATE jobs.jobs
        SET 
            status = 'COMPLETED',
            elapsed = $1
        WHERE id = $2`,
      [elapsedTime, job.id]
      )
    } catch (err) {
      const elapsedTime = timestamp() - startTime

      const isFinalAttempt = job.attempts >= job.maxAttempts

      if (isFinalAttempt) {
        await db.query(`
            UPDATE jobs.jobs 
            SET 
                status = 'FAILED', 
                error_message = $1,
                elapsed = $2
            WHERE id = $3`,
        [err.message, elapsedTime, job.id]
        )
        log.error(`Job ${job.id} (${job.handler}) failed after ${job.attempts} attempts: ${err.message}`, 'jobs/worker-thread', execId)
        await handlePermanentFailure(job, err.message)
      } else {
        const delay = Math.pow(2, job.attempts) * 1000
        await db.query(`
            UPDATE jobs.jobs 
            SET 
                status = 'PENDING', 
                error_message = $1, 
                run_at = $2,
                elapsed = $3
            WHERE id = $4`,
        [err.message, Date.now() + delay, elapsedTime, job.id]
        )
      }
    }
  }
}

/**
 * Handles jobs that have exhausted all retries
 */
async function handlePermanentFailure (job, error) {
  log.error(`CRITICAL: Job ${job.id} (${job.handler}) failed permanently: ${error}`, 'jobs/worker-thread', execId)
  if (job.notifyOnFailure) {
    await sendSupportEmail(`Error running job ${job.handler}`, `An error occurred while running the job ${job.handler}:\n\n${error}`)
  }
}

startWorker()
