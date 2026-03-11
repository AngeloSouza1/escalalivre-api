import { serializeUser } from '../../lib/serializers.js'
import { updateProfileSchema } from '../../lib/schemas.js'

function normalizeFunctions(value) {
  if (!value) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function registerUserRoutes(app) {
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

  app.patch('/me', {
    preHandler: app.authenticate,
    schema: updateProfileSchema,
  }, async (request) => {
    const body = request.body || {}
    const currentUser = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        workerProfile: true,
        businessProfile: true,
      },
    })

    if (!currentUser) {
      throw app.httpErrors.notFound('User not found')
    }

    const user = await app.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name: body.name?.trim() ?? currentUser.name,
        phone: body.phone?.trim() ?? currentUser.phone,
        city: body.city?.trim() ?? currentUser.city,
        workerProfile: currentUser.role === 'WORKER'
          ? {
              update: {
                headline: body.headline?.trim() ?? currentUser.workerProfile?.headline ?? null,
                bio: body.bio?.trim() ?? currentUser.workerProfile?.bio ?? null,
                functions: normalizeFunctions(body.functions) ?? currentUser.workerProfile?.functions ?? [],
                availability: body.availability?.trim() ?? currentUser.workerProfile?.availability ?? null,
              },
            }
          : undefined,
        businessProfile: currentUser.role === 'BUSINESS'
          ? {
              update: {
                businessName: body.businessName?.trim() ?? currentUser.businessProfile?.businessName,
                category: body.category?.trim() ?? currentUser.businessProfile?.category,
                document: body.document?.trim() ?? currentUser.businessProfile?.document ?? null,
                addressLine: body.addressLine?.trim() ?? currentUser.businessProfile?.addressLine ?? null,
                neighborhood: body.neighborhood?.trim() ?? currentUser.businessProfile?.neighborhood ?? null,
              },
            }
          : undefined,
      },
      include: {
        workerProfile: true,
        businessProfile: true,
      },
    })

    return { user: serializeUser(user) }
  })
}
