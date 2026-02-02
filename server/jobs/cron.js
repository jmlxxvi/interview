import log from '../platform/log.js'
import { db } from '../platform/db/index.js'
import { enqueue } from './jobs.js'

// -------------------------
// Cron parser utilities
// -------------------------

const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 }
const DAYS = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }

const CRON_ALIASES = {
  '@yearly': '0 0 0 1 1 *',
  '@annually': '0 0 0 1 1 *',
  '@monthly': '0 0 0 1 * *',
  '@weekly': '0 0 0 * * 0',
  '@daily': '0 0 0 * * *',
  '@midnight': '0 0 0 * * *',
  '@hourly': '0 0 * * * *'
}

function expandCron (cron) {
  return CRON_ALIASES[cron.trim().toLowerCase()] || cron
}

function validateField (value, field, min, max, names = {}) {
  field = field.toString().toUpperCase()
  if (field === '*') return true

  if (field.includes(',')) return field.split(',').every(f => validateField(value, f, min, max, names))
  if (field.startsWith('*/')) return value % parseInt(field.slice(2), 10) === 0
  if (field.includes('-')) {
    const [startRaw, endRaw] = field.split('-')
    const start = names[startRaw] ?? parseInt(startRaw, 10)
    const end = names[endRaw] ?? parseInt(endRaw, 10)
    return value >= start && value <= end
  }

  const num = names[field] ?? parseInt(field, 10)
  return value === num
}

function cronMatches (cron, date = new Date()) {
  cron = expandCron(cron)
  const fields = cron.trim().split(/\s+/)

  let sec, min, hour, day, month, dow

  if (fields.length === 6) [sec, min, hour, day, month, dow] = fields
  else if (fields.length === 5) { sec = '0'; [min, hour, day, month, dow] = fields } else throw new Error(`Invalid cron expression "${cron}" (expected 5 or 6 fields)`)

  return (
    validateField(date.getSeconds(), sec, 0, 59) &&
    validateField(date.getMinutes(), min, 0, 59) &&
    validateField(date.getHours(), hour, 0, 23) &&
    validateField(date.getDate(), day, 1, 31) &&
    validateField(date.getMonth() + 1, month, 1, 12, MONTHS) &&
    validateField(date.getDay(), dow, 0, 6, DAYS)
  )
}

function shouldRunJob (job, now) {
  // if (!job.is_active || !job.handler) return false
  try { return cronMatches(job.cron, now) } catch (e) {
    log.error(`Invalid cron "${job.cron}" for ${job.script}: ${e.message}`, 'cron')
    return false
  }
}

// -------------------------
// Scheduler loop
// -------------------------
// let i = 0
async function checkJobs () {
  const now = new Date()

  // Compute the start of the next second (HH:MM:SS.000)
  const next = new Date(now)
  next.setMilliseconds(0)
  next.setSeconds(next.getSeconds() + 1)

  const delay = next - now

  try {
    const query = `
    SELECT id, cron, "handler", payload
    FROM jobs.cron
    WHERE is_active = TRUE
  `

    const cronJobs = await db.query(query)

    setTimeout(async () => {
      if (delay > 900) { // Somtimes this logic makes it run twice in the same second, we avoid that by checking the delay
        try {
          for (const job of cronJobs) {
            if (shouldRunJob(job, now)) {
              const jobId = await enqueue({ handler: job.handler, payload: job.payload || {} })
              db.query(`
              INSERT INTO jobs.cron_jobs (cron_id, job_id)
              VALUES ($1, $2)
            `, [job.id, jobId])
              log.debug(`Scheduled cron job ${job.handler} (cron ID: ${job.id}, job ID: ${jobId})`, 'cron')
            }
          }
        } catch (err) {
          console.error('Job failed:', err)
        }
      }

      checkJobs() // schedule again for the next second
    }, delay)
  } catch (error) {
    log.error(`Error checking jobs: ${error.message}`, 'cron')
    await new Promise((resolve) => setTimeout(resolve, delay))
    checkJobs()
  }
}

export async function cronStart () {
  log.info('Starting Cron scheduler', 'cron')
  checkJobs()
}
