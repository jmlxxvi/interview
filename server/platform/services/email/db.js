import { db } from '../../db/index.js'
import { timestamp } from '../../../utils/index.js'

export async function createEmail (id, to, subject, body, userId = null) {
  await db.query(`INSERT INTO fman.emails
                    (id, user_id, recipient_email, sent_at)
                    VALUES({id}, {userId}, {to}, {sentAt})`,
  {
    id,
    userId,
    to,
    sentAt: timestamp(true)
  })

  await db.query(`INSERT INTO fman.emails_data
    (email_id, subject, body_html)
    VALUES({id}, {subject}, {body})`,
  {
    id,
    subject,
    body
  })
}

export async function changeEmailStatus (emailId, status, errorMessage = null) {
  let query = 'update fman.emails set status = {status}'
  const bind = { status, emailId }

  if (errorMessage) {
    query += ', error_message = {errorMessage}'
    bind.errorMessage = errorMessage
  }
  query += ' where id = {emailId}'

  return db.query(query, bind)
}
