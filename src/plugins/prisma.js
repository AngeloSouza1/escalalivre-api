import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default fp(async function prismaPlugin(app) {
  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await app.prisma.$disconnect()
  })
})
