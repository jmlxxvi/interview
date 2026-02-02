import { db } from '../../db.js'

export async function parametersGet (key = null, throwOnNotFound = false) {
  if (!key) throw new Error('Key is required')

  const query = 'select parameter_value from fman.parameters where parameter_key = {key}'
  const bind = { key }

  const data = await db.query(query, bind)

  if (throwOnNotFound && !data.length) throw new Error(`Parameter not found: ${key}`)

  return data.length ? data[0].parameter_value : null
}

export async function parametersSet (key, value) {
  if (!key) throw new Error('Key is required')

  const query = `
        insert into fman.parameters (parameter_key, parameter_value)
        values ({key}, {value})
        on conflict (parameter_key)
        do update set
            parameter_value = EXCLUDED.parameter_value
    `
  const bind = { key, value }

  await db.query(query, bind)
}

export async function parametersDelete (key) {
  if (!key) throw new Error('Key is required')

  const query = 'delete from fman.parameters where parameter_key = {key}'
  const bind = { key }

  await db.query(query, bind)
}
