import pkg from 'jsonwebtoken'
const { sign } = pkg

export function buildToken (secretKey, payload, extraOptions = {}) {
  // Generate the token
  const token = sign(payload, secretKey, {
    algorithm: 'RS384',
    ...extraOptions
  })

  return token
}
