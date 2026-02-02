import { ApiResponseOk } from '../../../../utils/response.js'
import { userRepository } from '../../../../repositories/user.js'

export async function findAll (args, context) {
  const response = await userRepository.findAll()

  return ApiResponseOk(response)
}
