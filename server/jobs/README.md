
## CRON syntax
```
┌───────────── second (0 - 59)
│ ┌───────────── minute (0 - 59)
│ │ ┌───────────── hour (0 - 23)
│ │ │ ┌───────────── day of month (1 - 31)
│ │ │ │ ┌───────────── month (1 - 12 or JAN-DEC)
│ │ │ │ │ ┌───────────── day of week (0 - 6 or SUN-SAT, Sunday=0)
│ │ │ │ │ │
* * * * * *

Special characters:
  *       any value
  */n     every n units (e.g. */5 for every 5 seconds)
  a,b,c   list of values (e.g. MON,WED,FRI)
  a-b     range of values (e.g. 1-5 for Mon–Fri)

Aliases:
  @yearly   (0 0 0 1 1 *)     → once a year, Jan 1st 00:00:00
  @annually (0 0 0 1 1 *)     → same as @yearly
  @monthly  (0 0 0 1 * *)     → first day of the month at 00:00:00
  @weekly   (0 0 0 * * 0)     → Sunday at 00:00:00
  @daily    (0 0 0 * * *)     → every day at 00:00:00
  @midnight (0 0 0 * * *)     → same as @daily
  @hourly   (0 0 * * * *)     → top of every hour at 0 seconds

Examples:
  */5 * * * * *       → every 5 seconds
  0 0 9 * * MON-FRI   → at 09:00:00 on weekdays
  30 2 14 * * SUN     → at 14:02:30 every Sunday
  0 0 0 1 JAN *       → midnight on January 1st
```

## Example Job that uses worker_threads internally

```js
// ./jobs/heavy.js
import { Worker } from 'worker_threads'

export default async function heavyJob(params) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./jobs/heavyWorker.js', { workerData: params })

    worker.on('message', msg => console.log('Worker message:', msg))
    worker.on('error', reject)
    worker.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`Worker exited with code ${code}`))
    })
  })
}

// ./jobs/heavyWorker.js
import { parentPort, workerData } from 'worker_threads'

// CPU-heavy computation
let sum = 0
for (let i = 0; i < 1e8; i++) sum += i

parentPort.postMessage(`Sum: ${sum}`)

```
