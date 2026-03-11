import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../../src/app.js'
import { hashPassword } from '../../src/lib/password.js'

const app = buildApp()

async function resetDatabase() {
  await app.prisma.review.deleteMany()
  await app.prisma.application.deleteMany()
  await app.prisma.job.deleteMany()
  await app.prisma.workerProfile.deleteMany()
  await app.prisma.businessProfile.deleteMany()
  await app.prisma.user.deleteMany()
}

async function createBusiness(overrides = {}) {
  const password = overrides.password || '123456'
  const suffix = randomUUID()

  const user = await app.prisma.user.create({
    data: {
      email: overrides.email || `business-${suffix}@test.dev`,
      passwordHash: await hashPassword(password),
      role: 'BUSINESS',
      name: overrides.name || 'Business Test',
      city: overrides.city || 'Sao Jose dos Campos',
      phone: overrides.phone || '12999990000',
      businessProfile: {
        create: {
          businessName: overrides.businessName || 'Business Test LTDA',
          category: overrides.category || 'bar',
          neighborhood: overrides.neighborhood || 'Centro',
          addressLine: overrides.addressLine || 'Rua Teste, 10',
        },
      },
    },
    include: {
      businessProfile: true,
    },
  })

  return { user, password }
}

async function createWorker(overrides = {}) {
  const password = overrides.password || '123456'
  const suffix = randomUUID()

  const user = await app.prisma.user.create({
    data: {
      email: overrides.email || `worker-${suffix}@test.dev`,
      passwordHash: await hashPassword(password),
      role: 'WORKER',
      name: overrides.name || 'Worker Test',
      city: overrides.city || 'Sao Jose dos Campos',
      phone: overrides.phone || '12999991111',
      workerProfile: {
        create: {
          headline: overrides.headline || 'Garcom para eventos',
          functions: overrides.functions || ['garcom', 'atendente'],
          availability: overrides.availability || 'Noites',
        },
      },
    },
    include: {
      workerProfile: true,
    },
  })

  return { user, password }
}

async function login(email, password) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password },
  })

  assert.equal(response.statusCode, 200, response.body)
  return response.json()
}

async function createJob(businessToken, overrides = {}) {
  const payload = {
    title: 'Garcom para sexta',
    description: 'Atendimento no salao durante o turno da noite.',
    category: 'garcom',
    city: 'Sao Jose dos Campos',
    neighborhood: 'Centro',
    paymentAmount: 150,
    startAt: '2026-03-13T18:00:00.000Z',
    endAt: '2026-03-13T23:00:00.000Z',
    slots: 1,
    ...overrides,
  }

  const response = await app.inject({
    method: 'POST',
    url: '/jobs',
    headers: {
      authorization: `Bearer ${businessToken}`,
    },
    payload,
  })

  assert.equal(response.statusCode, 201, response.body)
  return response.json().job
}

test.before(async () => {
  await app.ready()

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run integration tests')
  }
})

test.after(async () => {
  await resetDatabase()
  await app.close()
})

test.beforeEach(async () => {
  await resetDatabase()
})

test('login retorna token e usuario autenticado', async () => {
  const { user, password } = await createBusiness()

  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: user.email,
      password,
    },
  })

  assert.equal(response.statusCode, 200)

  const body = response.json()
  assert.equal(body.user.email, user.email)
  assert.equal(body.user.role, 'BUSINESS')
  assert.ok(body.token)
})

test('business cria vaga com sucesso', async () => {
  const business = await createBusiness()
  const auth = await login(business.user.email, business.password)

  const job = await createJob(auth.token)

  assert.equal(job.title, 'Garcom para sexta')
  assert.equal(job.paymentAmount, 150)
  assert.equal(job.status, 'OPEN')
})

test('worker nao pode se candidatar duas vezes na mesma vaga', async () => {
  const business = await createBusiness()
  const worker = await createWorker()
  const businessAuth = await login(business.user.email, business.password)
  const workerAuth = await login(worker.user.email, worker.password)
  const job = await createJob(businessAuth.token)

  const firstResponse = await app.inject({
    method: 'POST',
    url: `/jobs/${job.id}/applications`,
    headers: {
      authorization: `Bearer ${workerAuth.token}`,
    },
    payload: {
      message: 'Tenho experiencia em bares.',
    },
  })

  assert.equal(firstResponse.statusCode, 201, firstResponse.body)

  const secondResponse = await app.inject({
    method: 'POST',
    url: `/jobs/${job.id}/applications`,
    headers: {
      authorization: `Bearer ${workerAuth.token}`,
    },
    payload: {
      message: 'Segunda tentativa.',
    },
  })

  assert.equal(secondResponse.statusCode, 409, secondResponse.body)
  assert.equal(secondResponse.json().error, 'Worker already applied to this job')
})

test('business aprova candidatura pendente', async () => {
  const business = await createBusiness()
  const worker = await createWorker()
  const businessAuth = await login(business.user.email, business.password)
  const workerAuth = await login(worker.user.email, worker.password)
  const job = await createJob(businessAuth.token)

  const applicationResponse = await app.inject({
    method: 'POST',
    url: `/jobs/${job.id}/applications`,
    headers: {
      authorization: `Bearer ${workerAuth.token}`,
    },
    payload: {
      message: 'Disponivel para o turno.',
    },
  })

  const application = applicationResponse.json().application

  const approveResponse = await app.inject({
    method: 'PATCH',
    url: `/applications/${application.id}/status`,
    headers: {
      authorization: `Bearer ${businessAuth.token}`,
    },
    payload: {
      status: 'APPROVED',
    },
  })

  assert.equal(approveResponse.statusCode, 200, approveResponse.body)
  assert.equal(approveResponse.json().application.status, 'APPROVED')
})

test('review so pode ser criada apos job concluido e participante aprovado', async () => {
  const business = await createBusiness()
  const worker = await createWorker()
  const businessAuth = await login(business.user.email, business.password)
  const workerAuth = await login(worker.user.email, worker.password)
  const job = await createJob(businessAuth.token)

  const applicationResponse = await app.inject({
    method: 'POST',
    url: `/jobs/${job.id}/applications`,
    headers: {
      authorization: `Bearer ${workerAuth.token}`,
    },
    payload: {
      message: 'Experiencia em eventos.',
    },
  })

  const application = applicationResponse.json().application

  await app.inject({
    method: 'PATCH',
    url: `/applications/${application.id}/status`,
    headers: {
      authorization: `Bearer ${businessAuth.token}`,
    },
    payload: {
      status: 'APPROVED',
    },
  })

  const earlyReviewResponse = await app.inject({
    method: 'POST',
    url: `/jobs/${job.id}/reviews`,
    headers: {
      authorization: `Bearer ${businessAuth.token}`,
    },
    payload: {
      revieweeId: worker.user.id,
      rating: 5,
      comment: 'Excelente profissional.',
    },
  })

  assert.equal(earlyReviewResponse.statusCode, 400, earlyReviewResponse.body)
  assert.equal(earlyReviewResponse.json().error, 'Reviews are only allowed for completed jobs')

  const completedJobResponse = await app.inject({
    method: 'PATCH',
    url: `/jobs/${job.id}/status`,
    headers: {
      authorization: `Bearer ${businessAuth.token}`,
    },
    payload: {
      status: 'COMPLETED',
    },
  })

  assert.equal(completedJobResponse.statusCode, 200, completedJobResponse.body)

  const reviewResponse = await app.inject({
    method: 'POST',
    url: `/jobs/${job.id}/reviews`,
    headers: {
      authorization: `Bearer ${businessAuth.token}`,
    },
    payload: {
      revieweeId: worker.user.id,
      rating: 5,
      comment: 'Excelente profissional.',
    },
  })

  assert.equal(reviewResponse.statusCode, 201, reviewResponse.body)

  const review = reviewResponse.json().review
  assert.equal(review.rating, 5)
  assert.equal(review.targetType, 'WORKER')
})
