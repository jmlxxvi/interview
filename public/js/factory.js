import { backendRpc } from './backend.js'

export async function factoryFetchEntityCode (prefix) {
  const response = await backendRpc('app/shared', 'getEntityCode', { prefix })

  if (response.status.error) {
    throw new Error('Error fetching entity code: ' + response.status.message)
  }

  return response.data
}
