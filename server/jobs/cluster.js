import log from '../platform/log.js'

import { Worker } from 'node:worker_threads'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { startMaintenance } from './jobs.js'
import { uuid } from '../utils/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workerScript = path.join(__dirname, 'worker-thread.js')

const numThreads = Math.min(availableParallelism(), 4)
// const numThreads = 1 // TEMPORARY: limit to 1 for easier debugging

/**
 * Starts the multi-core job runner using Worker Threads
 */

export function startMultiCoreRunner () {
  // 1. Start maintenance in the main thread
  startMaintenance()

  // 2. Start the API/Server if you still have one
  // app.listen(4444); // This will only run ONCE now.

  // 3. Spawn Worker Threads
  for (let i = 0; i < numThreads; i++) {
    const execId = uuid()
    const worker = new Worker(workerScript, {
      workerData: {
        execId,
        workerIndex: i + 1
      }
    })

    worker.on('error', (err) => log.error(`Worker Thread Error: ${err.message}`, 'jobs/cluster', execId))
    worker.on('exit', (code) => {
      if (code !== 0) log.error(`Worker stopped with exit code ${code}`, 'jobs/cluster', execId)
    })
  }

  log.info(`Started ${numThreads} worker threads.`, 'jobs/cluster')
}
