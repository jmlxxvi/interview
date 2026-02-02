import session from '../../../platform/session.js'

export default async function () {
  // Initial call to start the expiration cycle
  session.expire()
}
