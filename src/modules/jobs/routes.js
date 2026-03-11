import { serializeApplication, serializeJob } from '../../lib/serializers.js'
import { createJobSchema, idParamSchema, listJobsSchema, updateJobStatusSchema } from '../../lib/schemas.js'

function parseDate(value, fieldName) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`)
    error.statusCode = 400
    throw error
  }

  return date
}

export async function registerJobRoutes(app) {
  app.post('/', {
    preHandler: app.authorize('BUSINESS'),
    schema: createJobSchema,
  }, async (request, reply) => {
    const body = request.body || {}

    if (!body.title || !body.description || !body.category || !body.city || !body.paymentAmount || !body.startAt || !body.endAt || !body.slots) {
      throw app.httpErrors.badRequest('title, description, category, city, paymentAmount, startAt, endAt and slots are required')
    }

    const startAt = parseDate(body.startAt, 'startAt')
    const endAt = parseDate(body.endAt, 'endAt')

    if (endAt <= startAt) {
      throw app.httpErrors.badRequest('endAt must be greater than startAt')
    }

    const job = await app.prisma.job.create({
      data: {
        businessId: request.user.sub,
        title: body.title.trim(),
        description: body.description.trim(),
        category: body.category.trim(),
        city: body.city.trim(),
        neighborhood: body.neighborhood?.trim(),
        addressLine: body.addressLine?.trim(),
        paymentAmount: body.paymentAmount,
        startAt,
        endAt,
        slots: Number(body.slots),
        notes: body.notes?.trim(),
      },
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
    })

    return reply.status(201).send({ job: serializeJob(job) })
  })

  app.get('/', {
    schema: listJobsSchema,
  }, async (request) => {
    const query = request.query || {}
    const status = query.status ? String(query.status).toUpperCase() : 'OPEN'
    const take = Math.min(Number(query.limit) || 20, 100)
    const skip = Math.max(Number(query.offset) || 0, 0)

    const where = {
      status,
      city: query.city ? { equals: String(query.city), mode: 'insensitive' } : undefined,
      category: query.category ? { equals: String(query.category), mode: 'insensitive' } : undefined,
    }

    const jobs = await app.prisma.job.findMany({
      where,
      orderBy: {
        startAt: 'asc',
      },
      skip,
      take,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            businessProfile: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    })

    return {
      jobs: jobs.map(serializeJob),
      pagination: {
        limit: take,
        offset: skip,
      },
    }
  })

  app.get('/mine', {
    preHandler: app.authorize('BUSINESS'),
  }, async (request) => {
    const jobs = await app.prisma.job.findMany({
      where: {
        businessId: request.user.sub,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    })

    return { jobs: jobs.map(serializeJob) }
  })

  app.get('/:id', {
    schema: {
      params: idParamSchema,
    },
  }, async (request) => {
    const job = await app.prisma.job.findUnique({
      where: { id: request.params.id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            businessProfile: true,
          },
        },
        applications: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                city: true,
                workerProfile: true,
              },
            },
          },
        },
      },
    })

    if (!job) {
      throw app.httpErrors.notFound('Job not found')
    }

    return { job: serializeJob(job) }
  })

  app.patch('/:id/status', {
    preHandler: app.authorize('BUSINESS'),
    schema: updateJobStatusSchema,
  }, async (request) => {
    const { status } = request.body || {}
    const nextStatus = String(status || '').toUpperCase()

    if (!['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(nextStatus)) {
      throw app.httpErrors.badRequest('Invalid status')
    }

    const existingJob = await app.prisma.job.findFirst({
      where: {
        id: request.params.id,
        businessId: request.user.sub,
      },
    })

    if (!existingJob) {
      throw app.httpErrors.notFound('Job not found')
    }

    const job = await app.prisma.job.update({
      where: { id: existingJob.id },
      data: {
        status: nextStatus,
      },
    })

    return { job: serializeJob(job) }
  })

  app.get('/:id/applications', {
    preHandler: app.authorize('BUSINESS'),
    schema: {
      params: idParamSchema,
    },
  }, async (request) => {
    const job = await app.prisma.job.findFirst({
      where: {
        id: request.params.id,
        businessId: request.user.sub,
      },
    })

    if (!job) {
      throw app.httpErrors.notFound('Job not found')
    }

    const applications = await app.prisma.application.findMany({
      where: {
        jobId: job.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            phone: true,
            city: true,
            workerProfile: true,
          },
        },
      },
    })

    return { applications: applications.map(serializeApplication) }
  })
}
