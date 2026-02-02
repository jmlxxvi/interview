import nodemailer from 'nodemailer'

import log from '../../log.js'
import config from '../../../config.js'

import { createEmail, changeEmailStatus } from './db.js'
import { uuid } from '../../../utils/index.js'

// Gmail
const transporter = nodemailer.createTransport({
  service: config.services.email.service,
  host: config.services.email.host,
  port: config.services.email.port,
  secure: config.services.email.secure, // true for 465, false for other ports
  auth: {
    user: config.services.email.user,
    pass: config.services.email.password
  }
})

export async function serviceEmailSend ({
  to,
  subject = '',
  body = '',
  userId = null,
  emailId = uuid(),
  saveOnDb = true
}) {
  console.log(`Sending mail, host: ${config.services.email.host} , user: ${config.services.email.user}`)

  // In non production environment, all emails are sent to the drain address
  const recipient = config.environment === 'production' ? to : config.services.email.drainEmailAddress

  if (recipient) {
    if (saveOnDb) {
      await createEmail(emailId, to, subject, body, userId)
    }

    log.debug(`Sending email to ${recipient}`, 'serviceEmailSend')

    const mailOptions = {
      from: config.services.email.fromEmailAddress,
      to: recipient,
      subject,
      text: body,
      html: body,
      headers: {
        'List-Unsubscribe': `<${config.server.base_url}/unsubscribe>`
      }
    }

    try {
      const info = await transporter.sendMail(mailOptions)

      if (saveOnDb) {
        await changeEmailStatus(emailId, 'SENT')
      }

      return {
        error: false,
        message: info.response
      }
    } catch (error) {
      log.error('Error sending email: ' + error, 'serviceEmailSend')

      if (saveOnDb) {
        await changeEmailStatus(emailId, 'ERROR', error.message)
      }

      return {
        error: true,
        message: error.message
      }
    }
  } else {
    log.debug('Recipient is empty', 'serviceEmailSend')
  }
}
