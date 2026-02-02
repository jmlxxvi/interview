export function log (message, logContext, error = false) {
  const time = new Date()

  const t = ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2) + ':' + ('0' + time.getSeconds()).slice(-2) + '.' + ('00' + time.getMilliseconds()).slice(-3)

  const m = `${t} [${logContext}] ${message}`

  if (error) {
    console.error(m)
  } else {
    console.log(m)
  }
}
