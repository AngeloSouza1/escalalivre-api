import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import { registerAuthRoutes } from './modules/auth/routes.js'
import { registerUserRoutes } from './modules/users/routes.js'
import { registerJobRoutes } from './modules/jobs/routes.js'
import { registerApplicationRoutes } from './modules/applications/routes.js'
import { registerReviewRoutes } from './modules/reviews/routes.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, {
    origin: true,
    credentials: true,
  })
  app.register(sensible)

  app.register(prismaPlugin)
  app.register(authPlugin)

  app.get('/health', async () => ({
    status: 'ok',
    service: 'escalalivre-api',
    timestamp: new Date().toISOString(),
  }))

  app.register(registerAuthRoutes, { prefix: '/auth' })
  app.register(registerUserRoutes, { prefix: '/users' })
  app.register(registerJobRoutes, { prefix: '/jobs' })
  app.register(registerApplicationRoutes)
  app.register(registerReviewRoutes)

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error)

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation error',
        details: error.validation.map((item) => ({
          field: item.instancePath || item.params?.missingProperty || item.schemaPath,
          message: item.message,
        })),
      })
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.message,
      })
    }

    return reply.status(500).send({
      error: 'Internal server error',
    })
  })

  return app
}
