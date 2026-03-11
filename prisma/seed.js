import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL nao configurada. Defina a variavel de ambiente antes de executar o seed.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function upsertBusiness({ email, name, city, phone, businessName, category, neighborhood, addressLine }) {
  const passwordHash = await hashPassword('123456')

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      city,
      phone,
      role: 'BUSINESS',
      businessProfile: {
        upsert: {
          update: {
            businessName,
            category,
            neighborhood,
            addressLine,
          },
          create: {
            businessName,
            category,
            neighborhood,
            addressLine,
          },
        },
      },
    },
    create: {
      email,
      passwordHash,
      role: 'BUSINESS',
      name,
      city,
      phone,
      businessProfile: {
        create: {
          businessName,
          category,
          neighborhood,
          addressLine,
        },
      },
    },
    include: {
      businessProfile: true,
    },
  })
}

async function upsertWorker({ email, name, city, phone, headline, functions, availability }) {
  const passwordHash = await hashPassword('123456')

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      city,
      phone,
      role: 'WORKER',
      workerProfile: {
        upsert: {
          update: {
            headline,
            functions,
            availability,
          },
          create: {
            headline,
            functions,
            availability,
          },
        },
      },
    },
    create: {
      email,
      passwordHash,
      role: 'WORKER',
      name,
      city,
      phone,
      workerProfile: {
        create: {
          headline,
          functions,
          availability,
        },
      },
    },
    include: {
      workerProfile: true,
    },
  })
}

async function main() {
  const businesses = await Promise.all([
    upsertBusiness({
      email: 'bar.centro@escalalivre.dev',
      name: 'Carlos do Bar',
      city: 'Sao Jose dos Campos',
      phone: '12999990001',
      businessName: 'Bar do Centro',
      category: 'bar',
      neighborhood: 'Centro',
      addressLine: 'Rua 7 de Setembro, 120',
    }),
    upsertBusiness({
      email: 'padaria.vila@escalalivre.dev',
      name: 'Fernanda Padaria',
      city: 'Taubate',
      phone: '12999990002',
      businessName: 'Padaria Vila Nova',
      category: 'padaria',
      neighborhood: 'Vila Nova',
      addressLine: 'Av. Italia, 450',
    }),
  ])

  const workers = await Promise.all([
    upsertWorker({
      email: 'maria@escalalivre.dev',
      name: 'Maria Oliveira',
      city: 'Sao Jose dos Campos',
      phone: '12999991001',
      headline: 'Garcom e atendimento para bares e eventos',
      functions: ['garcom', 'atendente'],
      availability: 'Noites e finais de semana',
    }),
    upsertWorker({
      email: 'joao@escalalivre.dev',
      name: 'Joao Santos',
      city: 'Taubate',
      phone: '12999991002',
      headline: 'Apoio operacional e reposicao',
      functions: ['ajudante', 'reposicao', 'caixa'],
      availability: 'Integral',
    }),
    upsertWorker({
      email: 'ana@escalalivre.dev',
      name: 'Ana Lima',
      city: 'Cacapava',
      phone: '12999991003',
      headline: 'Bartender e recepcao para eventos',
      functions: ['bartender', 'recepcionista'],
      availability: 'Tardes e noites',
    }),
  ])

  await prisma.review.deleteMany()
  await prisma.application.deleteMany()
  await prisma.job.deleteMany()

  const [barBusiness, padariaBusiness] = businesses
  const [maria, joao, ana] = workers

  const openJob = await prisma.job.create({
    data: {
      businessId: barBusiness.id,
      title: '2 Garcons para sexta a noite',
      description: 'Atendimento no salao e apoio no fechamento do bar.',
      category: 'garcom',
      city: 'Sao Jose dos Campos',
      neighborhood: 'Centro',
      addressLine: 'Rua 7 de Setembro, 120',
      paymentAmount: 150,
      startAt: new Date('2026-03-13T18:00:00.000Z'),
      endAt: new Date('2026-03-13T23:00:00.000Z'),
      slots: 2,
      status: 'OPEN',
      notes: 'Chegar 30 minutos antes para briefing.',
    },
  })

  const inProgressJob = await prisma.job.create({
    data: {
      businessId: padariaBusiness.id,
      title: 'Caixa para cobertura de turno',
      description: 'Operacao de caixa e apoio no atendimento da padaria.',
      category: 'caixa',
      city: 'Taubate',
      neighborhood: 'Vila Nova',
      addressLine: 'Av. Italia, 450',
      paymentAmount: 130,
      startAt: new Date('2026-03-12T10:00:00.000Z'),
      endAt: new Date('2026-03-12T17:00:00.000Z'),
      slots: 1,
      status: 'IN_PROGRESS',
    },
  })

  const completedJob = await prisma.job.create({
    data: {
      businessId: barBusiness.id,
      title: 'Bartender para evento corporativo',
      description: 'Preparo de drinks e atendimento no evento.',
      category: 'bartender',
      city: 'Sao Jose dos Campos',
      neighborhood: 'Jardim Aquarius',
      addressLine: 'Espaco Eventos Aquarius, 88',
      paymentAmount: 220,
      startAt: new Date('2026-03-08T19:00:00.000Z'),
      endAt: new Date('2026-03-09T01:00:00.000Z'),
      slots: 1,
      status: 'COMPLETED',
    },
  })

  const cancelledJob = await prisma.job.create({
    data: {
      businessId: padariaBusiness.id,
      title: 'Ajudante para inventario',
      description: 'Contagem de estoque e organizacao do deposito.',
      category: 'ajudante',
      city: 'Taubate',
      neighborhood: 'Vila Nova',
      paymentAmount: 110,
      startAt: new Date('2026-03-15T11:00:00.000Z'),
      endAt: new Date('2026-03-15T16:00:00.000Z'),
      slots: 1,
      status: 'CANCELLED',
    },
  })

  const pendingApplication = await prisma.application.create({
    data: {
      jobId: openJob.id,
      workerId: maria.id,
      status: 'PENDING',
      message: 'Tenho experiencia em bares com movimento intenso.',
    },
  })

  const approvedApplication = await prisma.application.create({
    data: {
      jobId: inProgressJob.id,
      workerId: joao.id,
      status: 'APPROVED',
      message: 'Ja trabalhei em caixa e reposicao em padaria.',
    },
  })

  const completedApplication = await prisma.application.create({
    data: {
      jobId: completedJob.id,
      workerId: ana.id,
      status: 'APPROVED',
      message: 'Atuei em eventos corporativos e casamentos.',
    },
  })

  await prisma.review.createMany({
    data: [
      {
        jobId: completedJob.id,
        reviewerId: barBusiness.id,
        revieweeId: ana.id,
        targetType: 'WORKER',
        rating: 5,
        comment: 'Pontual, profissional e muito boa no atendimento.',
      },
      {
        jobId: completedJob.id,
        reviewerId: ana.id,
        revieweeId: barBusiness.id,
        targetType: 'BUSINESS',
        rating: 5,
        comment: 'Organizacao clara e pagamento sem atrito.',
      },
    ],
  })

  console.log('Seed concluido com sucesso.')
  console.log('Usuarios de teste:')
  console.log('- BUSINESS: bar.centro@escalalivre.dev / 123456')
  console.log('- BUSINESS: padaria.vila@escalalivre.dev / 123456')
  console.log('- WORKER: maria@escalalivre.dev / 123456')
  console.log('- WORKER: joao@escalalivre.dev / 123456')
  console.log('- WORKER: ana@escalalivre.dev / 123456')
  console.log('Resumo:')
  console.log(`- Jobs criados: 4`)
  console.log(`- Applications criadas: 3`)
  console.log(`- Reviews criadas: 2`)
  console.log(`- IDs uteis: openJob=${openJob.id}, pendingApplication=${pendingApplication.id}, approvedApplication=${approvedApplication.id}, completedApplication=${completedApplication.id}, cancelledJob=${cancelledJob.id}`)
}

main()
  .catch((error) => {
    console.error('Falha ao executar seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
