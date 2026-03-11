import { loginUser, registerUser } from './service.js'
import { serializeUser } from '../../lib/serializers.js'
import { loginSchema, registerSchema } from '../../lib/schemas.js'

export async function registerAuthRoutes(app) {
  app.post('/register', {
    schema: registerSchema,
  }, async (request, reply) => {
    const result = await registerUser(app.prisma, request.body || {})
    return reply.status(201).send(result)
  })

  app.post('/login', {
    schema: loginSchema,
  }, async (request) => {
    return loginUser(app.prisma, request.body || {})
  })

  app.get('/me', {
    preHandler: app.authenticate,
  }, async (request) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        workerProfile: true,
        businessProfile: true,
      },
    })

    if (!user) {
      throw app.httpErrors.notFound('User not found')
    }

    return { user: serializeUser(user) }
  })
}
