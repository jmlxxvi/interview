import { db } from '../platform/db/index.js'

export async function generateEntityCode (prefix = 'CODE') {
  let extra = ''

  if (prefix === 'LOT') {
    // Add date in YYYY-MM-DD format
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    extra = `${year}-${month}-${day}-`
  }

  const result = await db.value(
    "SELECT nextval('interview.general_codes_seq') as next_val"
  )

  const sequenceValue = parseInt(result, 10)

  // Format the number with leading zeros (5 digits)
  const formattedNumber = sequenceValue.toString().padStart(5, '0')

  // Return the formatted code
  return `${prefix}-${extra}${formattedNumber}`
}
