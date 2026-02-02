import { ApiResponseOk } from '../../../../utils/response.js'
import { timestamp } from '../../../../utils/index.js'
import { planningService } from '../../../../services/planning.js'

export async function getTimePhasedAvailability (args, context) {
  const { entityId, plantId } = context.session

  const productId = '25854f91-edd3-4a2a-9030-2629614eebbb'
  const vendorId = 'fce9a960-145c-4cec-98a5-09471d13a005'
  const startEpoch = timestamp()
  const endEpoch = timestamp() + (1000 * 60 * 60 * 24 * 30) // 30 days ahead
  const bucketSizeSeconds = 1000 * 60 * 60 * 24 // 1 day

  const response = await planningService.getTimePhasedAvailability(
    context,
    entityId,
    plantId,
    productId,
    vendorId,
    startEpoch,
    endEpoch,
    bucketSizeSeconds
  )

  return ApiResponseOk(response)
}
