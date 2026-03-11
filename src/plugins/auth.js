import fp from 'fastify-plugin'
import { verifyToken } from '../lib/jwt.js'

function getBearerToken(header) {
  if (!header) {
    return null
  }

  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return null
  }

  return token
}

export default fp(async function authPlugin(app) {
  app.decorate('authenticate', async function authenticate(request) {
    const token = getBearerToken(request.headers.authorization)

    if (!token) {
      throw app.httpErrors.unauthorized('Missing bearer token')
    }

    try {
      request.user = verifyToken(token)
    } catch (error) {
      throw app.httpErrors.unauthorized('Invalid or expired token')
    }
  })

  app.decorate('authorize', function authorize(...roles) {
    return async function authorizeHook(request) {
      await app.authenticate(request)

      if (!roles.includes(request.user.role)) {
        throw app.httpErrors.forbidden('Insufficient permissions')
      }
    }
  })
})
