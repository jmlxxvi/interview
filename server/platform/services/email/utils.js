import config from '../../../config.js'

import { template } from './templates/generic.js'
import { serviceEmailSend } from './index.js'

export async function sendSupportEmail (subject, message, title = 'Error') {
  const to = config.services.email.supportEmailAddress

  const logoUrl = config.services.email.logoUrl

  // title, message, logoUrl, ctaUrl, ctaLabel, unsubscribeUrl
  const html = template(
    title,
    message,
    logoUrl
  )

  await serviceEmailSend({
    to,
    subject: `[${config.environment}] ${subject}`,
    body: html
  })
}
