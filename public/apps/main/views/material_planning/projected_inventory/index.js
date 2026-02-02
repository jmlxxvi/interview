import { backendRpc } from '../../../../../js/backend.js'

export async function show (params) {
  const response = await backendRpc('app/material_planning/projected_inventory', 'getTimePhasedAvailability', {
    workOrderId: params.workOrderId
  })

  console.log('response: ', response)
}

export async function hide () {
}
