import { serializeApplication } from '../../lib/serializers.js'
import { applyToJobSchema, updateApplicationStatusSchema } from '../../lib/schemas.js'

export async function registerApplicationRoutes(app) {
  app.post('/jobs/:jobId/applications', {
    preHandler: app.authorize('WORKER'),
    schema: applyToJobSchema,
  }, async (request, reply) => {
    const body = request.body || {}

    const job = await app.prisma.job.findUnique({
      where: { id: request.params.jobId },
    })

    if (!job) {
      throw app.httpErrors.notFound('Job not found')
    }

    if (job.status !== 'OPEN') {
      throw app.httpErrors.badRequest('Only open jobs accept applications')
    }

    const approvedCount = await app.prisma.application.count({
      where: {
        jobId: job.id,
        status: 'APPROVED',
      },
    })

    if (approvedCount >= job.slots) {
      throw app.httpErrors.badRequest('Job has no available slots')
    }

    try {
      const application = await app.prisma.application.create({
        data: {
          jobId: job.id,
          workerId: request.user.sub,
          message: body.message?.trim(),
        },
      })

      return reply.status(201).send({ application: serializeApplication(application) })
    } catch (error) {
      if (error.code === 'P2002') {
        throw app.httpErrors.conflict('Worker already applied to this job')
      }

      throw error
    }
  })

  app.get('/applications/mine', {
    preHandler: app.authorize('WORKER'),
  }, async (request) => {
    const applications = await app.prisma.application.findMany({
      where: {
        workerId: request.user.sub,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        job: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                city: true,
                businessProfile: true,
              },
            },
          },
        },
      },
    })

    return { applications: applications.map(serializeApplication) }
  })

  app.patch('/applications/:id/status', {
    preHandler: app.authorize('BUSINESS'),
    schema: updateApplicationStatusSchema,
  }, async (request) => {
    const nextStatus = String(request.body?.status || '').toUpperCase()

    if (!['APPROVED', 'REJECTED'].includes(nextStatus)) {
      throw app.httpErrors.badRequest('status must be APPROVED or REJECTED')
    }

    const application = await app.prisma.application.findUnique({
      where: { id: request.params.id },
      include: {
        job: true,
      },
    })

    if (!application || application.job.businessId !== request.user.sub) {
      throw app.httpErrors.notFound('Application not found')
    }

    if (nextStatus === 'APPROVED') {
      const approvedCount = await app.prisma.application.count({
        where: {
          jobId: application.jobId,
          status: 'APPROVED',
        },
      })

      if (approvedCount >= application.job.slots) {
        throw app.httpErrors.badRequest('Job has no available slots')
      }
    }

    const updated = await app.prisma.application.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
      },
    })

    return { application: serializeApplication(updated) }
  })
}
