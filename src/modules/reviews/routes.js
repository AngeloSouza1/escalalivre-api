import { serializeReview } from '../../lib/serializers.js'
import { createReviewSchema } from '../../lib/schemas.js'

export async function registerReviewRoutes(app) {
  app.post('/jobs/:jobId/reviews', {
    preHandler: app.authenticate,
    schema: createReviewSchema,
  }, async (request, reply) => {
    const body = request.body || {}
    const rating = Number(body.rating)

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw app.httpErrors.badRequest('rating must be an integer between 1 and 5')
    }

    const job = await app.prisma.job.findUnique({
      where: { id: request.params.jobId },
      include: {
        applications: true,
      },
    })

    if (!job) {
      throw app.httpErrors.notFound('Job not found')
    }

    if (job.status !== 'COMPLETED') {
      throw app.httpErrors.badRequest('Reviews are only allowed for completed jobs')
    }

    const isBusiness = job.businessId === request.user.sub
    const approvedApplication = job.applications.find(
      (application) => application.workerId === request.user.sub && application.status === 'APPROVED',
    )

    if (!isBusiness && !approvedApplication) {
      throw app.httpErrors.forbidden('Only participants can review this job')
    }

    const revieweeId = isBusiness ? body.revieweeId : job.businessId

    if (!revieweeId) {
      throw app.httpErrors.badRequest('revieweeId is required')
    }

    if (isBusiness) {
      const isApprovedWorker = job.applications.some(
        (application) => application.workerId === revieweeId && application.status === 'APPROVED',
      )

      if (!isApprovedWorker) {
        throw app.httpErrors.badRequest('revieweeId must belong to an approved worker')
      }
    } else if (revieweeId !== job.businessId) {
      throw app.httpErrors.badRequest('Workers can only review the business owner')
    }

    const review = await app.prisma.review.create({
      data: {
        jobId: job.id,
        reviewerId: request.user.sub,
        revieweeId,
        targetType: isBusiness ? 'WORKER' : 'BUSINESS',
        rating,
        comment: body.comment?.trim(),
      },
    }).catch((error) => {
      if (error.code === 'P2002') {
        throw app.httpErrors.conflict('Review already submitted for this participant')
      }

      throw error
    })

    return reply.status(201).send({ review: serializeReview(review) })
  })

  app.get('/reviews/me', {
    preHandler: app.authenticate,
  }, async (request) => {
    const reviews = await app.prisma.review.findMany({
      where: {
        revieweeId: request.user.sub,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
      },
    })

    return { reviews: reviews.map(serializeReview) }
  })
}
