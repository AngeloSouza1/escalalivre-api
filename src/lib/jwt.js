import jwt from 'jsonwebtoken'

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function getSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return secret
}

export function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret())
}
