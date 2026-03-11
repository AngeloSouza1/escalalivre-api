import { comparePassword, hashPassword } from '../../lib/password.js'
import { serializeUser } from '../../lib/serializers.js'
import { signToken } from '../../lib/jwt.js'

function normalizeRole(role) {
  return String(role || '').toUpperCase()
}

function normalizeFunctions(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function registerUser(prisma, payload) {
  const role = normalizeRole(payload.role)

  if (!['WORKER', 'BUSINESS'].includes(role)) {
    const error = new Error('role must be WORKER or BUSINESS')
    error.statusCode = 400
    throw error
  }

  if (!payload.email || !payload.password || !payload.name || !payload.city) {
    const error = new Error('name, email, password and city are required')
    error.statusCode = 400
    throw error
  }

  if (role === 'BUSINESS' && (!payload.businessName || !payload.category)) {
    const error = new Error('businessName and category are required for BUSINESS')
    error.statusCode = 400
    throw error
  }

  const passwordHash = await hashPassword(payload.password)

  try {
    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase().trim(),
        passwordHash,
        role,
        name: payload.name.trim(),
        phone: payload.phone?.trim(),
        city: payload.city.trim(),
        workerProfile: role === 'WORKER'
          ? {
              create: {
                headline: payload.headline?.trim(),
                bio: payload.bio?.trim(),
                functions: normalizeFunctions(payload.functions),
                availability: payload.availability?.trim(),
              },
            }
          : undefined,
        businessProfile: role === 'BUSINESS'
          ? {
              create: {
                businessName: payload.businessName.trim(),
                category: payload.category.trim(),
                document: payload.document?.trim(),
                addressLine: payload.addressLine?.trim(),
                neighborhood: payload.neighborhood?.trim(),
              },
            }
          : undefined,
      },
      include: {
        workerProfile: true,
        businessProfile: true,
      },
    })

    return {
      token: signToken({ sub: user.id, role: user.role, email: user.email }),
      user: serializeUser(user),
    }
  } catch (error) {
    if (error.code === 'P2002') {
      const duplicate = new Error('email already in use')
      duplicate.statusCode = 409
      throw duplicate
    }

    throw error
  }
}

export async function loginUser(prisma, payload) {
  if (!payload.email || !payload.password) {
    const error = new Error('email and password are required')
    error.statusCode = 400
    throw error
  }

  const user = await prisma.user.findUnique({
    where: {
      email: payload.email.toLowerCase().trim(),
    },
    include: {
      workerProfile: true,
      businessProfile: true,
    },
  })

  if (!user) {
    const error = new Error('invalid credentials')
    error.statusCode = 401
    throw error
  }

  const isValid = await comparePassword(payload.password, user.passwordHash)

  if (!isValid) {
    const error = new Error('invalid credentials')
    error.statusCode = 401
    throw error
  }

  return {
    token: signToken({ sub: user.id, role: user.role, email: user.email }),
    user: serializeUser(user),
  }
}
