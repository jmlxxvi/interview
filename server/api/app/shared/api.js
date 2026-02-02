import { ApiResponseOk } from '../../../utils/response.js'

import { generateEntityCode } from '../../../services/utils.js'

export async function getEntityCode (args, context) {
  const { prefix = 'CODE' } = args

  const code = await generateEntityCode(prefix)

  return ApiResponseOk(code)
}
