import { db } from '../platform/db/index.js'
import log from '../platform/log.js'

import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { timestamp } from '../utils/index.js'

// Helper to handle paths in ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HANDLERS_DIR = path.join(__dirname, 'handlers')

/**
 * Enqueues a job with a safety check for the handler file
 */
export async function enqueue ({ handler, payload = {}, runAt = timestamp(), priority = 0, maxAttempts = 3, execId = null, notifyOnFailure = false }) {
  log.info(`Enqueuing job: handler=${handler}, runAt=${new Date(runAt).toISOString()}, priority=${priority}`, 'jobs/jobs', execId)
  // 1. Basic Security: Prevent directory traversal
  if (handler.includes('..') || path.isAbsolute(handler)) {
    throw new Error('Invalid handler path: traversal not allowed')
  }

  // 2. Existence Check
  const filePath = path.join(HANDLERS_DIR, handler)
  try {
    await fs.access(filePath)
  } catch {
    throw new Error(`Handler file not found: ${handler} at ${filePath}`)
  }

  // 3. Insert into DB
  const query = `
    INSERT INTO jobs.jobs (handler, payload, run_at, priority, max_attempts, notify_on_failure)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `
  const jobsReturn = await db.dml(query, [handler, payload, runAt, priority, maxAttempts, notifyOnFailure])
  return jobsReturn.id
}

/**
 * Deletes completed or failed jobs older than a certain age
 * @param {number} maxAgeMs - Age in milliseconds (e.g., 30 days)
 */
export async function cleanupJobs (maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
  const threshold = timestamp() - maxAgeMs
  const query = `
    DELETE FROM jobs.jobs
    WHERE (status = 'COMPLETED' OR status = 'FAILED') 
      AND run_at < $1
  `
  return await db.dml(query, [threshold])
}

export async function recoverStuckJobs (timeoutMs = 10 * 60 * 1000) {
  const threshold = timestamp() - timeoutMs
  const query = `
    UPDATE jobs.jobs
    SET status = 'PENDING' 
    WHERE status = 'RUNNING' 
      AND locked_at < $1
  `
  return await db.dml(query, [threshold])
}

/**
 * Starts background maintenance for the job system
 */
export function startMaintenance () {
  const cleanupAgeMs = 7 * 24 * 60 * 60 * 1000 // 7 days
  const recoveryTimeoutMs = 15 * 60 * 1000 // 15 minutes
  const intervalMs = 60 * 60 * 1000 // Run every hour

  const run = async () => {
    try {
      log.info('Running job maintenance...', 'jobs/jobs')

      // 1. Delete old jobs
      const deletedCount = await db.value(
        `WITH deleted AS (
           DELETE FROM jobs.jobs
           WHERE (status = 'COMPLETED' OR status = 'FAILED') 
           AND run_at < $1 
           RETURNING id
         ) SELECT count(*) FROM deleted`,
        [timestamp() - cleanupAgeMs]
      )

      // 2. Reset stuck jobs
      const recoveredCount = await db.value(
        `WITH updated AS (
           UPDATE jobs.jobs 
           SET status = 'PENDING' 
           WHERE status = 'RUNNING' 
           AND locked_at < $1 
           RETURNING id
         ) SELECT count(*) FROM updated`,
        [timestamp() - recoveryTimeoutMs]
      )

      // 3. Purge cron_jobs table deleting entries not on jobs table
      await db.dml(`
        DELETE FROM jobs.cron_jobs
        WHERE job_id NOT IN (SELECT id FROM jobs.jobs)
      `)

      log.info(`Maintenance complete: Cleaned ${deletedCount}, Recovered ${recoveredCount}`, 'jobs/jobs')
    } catch (err) {
      log.error('Maintenance error:' + err, 'jobs/jobs')
    }
  }

  // Run immediately on start, then on interval
  run()
  return setInterval(run, intervalMs)
}

/**
 * Returns a summary of the current queue state
 */
export async function getQueueStats () {
  const query = `
    SELECT 
      status, 
      count(*) as count,
      min(run_at) as oldest_run_at
    FROM jobs.jobs
    GROUP BY status
  `
  // Assuming your db driver returns an array of objects for raw sql
  return await db.query(query)
}
