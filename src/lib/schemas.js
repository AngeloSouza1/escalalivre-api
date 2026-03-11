export const userRoleEnum = ['WORKER', 'BUSINESS']
export const jobStatusEnum = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
export const applicationStatusEnum = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']

export const idParamSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
  },
}

export const jobIdParamSchema = {
  type: 'object',
  required: ['jobId'],
  additionalProperties: false,
  properties: {
    jobId: { type: 'string', minLength: 1 },
  },
}

export const registerSchema = {
  body: {
    type: 'object',
    required: ['role', 'name', 'email', 'password', 'city'],
    additionalProperties: false,
    properties: {
      role: { type: 'string', enum: userRoleEnum },
      name: { type: 'string', minLength: 2, maxLength: 120 },
      email: { type: 'string', format: 'email', maxLength: 255 },
      password: { type: 'string', minLength: 6, maxLength: 100 },
      phone: { type: 'string', minLength: 8, maxLength: 30 },
      city: { type: 'string', minLength: 2, maxLength: 120 },
      headline: { type: 'string', maxLength: 160 },
      bio: { type: 'string', maxLength: 1000 },
      functions: {
        anyOf: [
          {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 80 },
            maxItems: 20,
          },
          { type: 'string', minLength: 1, maxLength: 500 },
        ],
      },
      availability: { type: 'string', maxLength: 160 },
      businessName: { type: 'string', minLength: 2, maxLength: 160 },
      category: { type: 'string', minLength: 2, maxLength: 80 },
      document: { type: 'string', maxLength: 40 },
      addressLine: { type: 'string', maxLength: 255 },
      neighborhood: { type: 'string', maxLength: 120 },
    },
    allOf: [
      {
        if: {
          properties: {
            role: { const: 'BUSINESS' },
          },
        },
        then: {
          required: ['businessName', 'category'],
        },
      },
    ],
  },
}

export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 255 },
      password: { type: 'string', minLength: 6, maxLength: 100 },
    },
  },
}

export const updateProfileSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 120 },
      phone: { type: 'string', minLength: 8, maxLength: 30 },
      city: { type: 'string', minLength: 2, maxLength: 120 },
      headline: { type: 'string', maxLength: 160 },
      bio: { type: 'string', maxLength: 1000 },
      functions: {
        anyOf: [
          {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 80 },
            maxItems: 20,
          },
          { type: 'string', minLength: 1, maxLength: 500 },
        ],
      },
      availability: { type: 'string', maxLength: 160 },
      businessName: { type: 'string', minLength: 2, maxLength: 160 },
      category: { type: 'string', minLength: 2, maxLength: 80 },
      document: { type: 'string', maxLength: 40 },
      addressLine: { type: 'string', maxLength: 255 },
      neighborhood: { type: 'string', maxLength: 120 },
    },
    minProperties: 1,
  },
}

export const createJobSchema = {
  body: {
    type: 'object',
    required: ['title', 'description', 'category', 'city', 'paymentAmount', 'startAt', 'endAt', 'slots'],
    additionalProperties: false,
    properties: {
      title: { type: 'string', minLength: 3, maxLength: 160 },
      description: { type: 'string', minLength: 10, maxLength: 2000 },
      category: { type: 'string', minLength: 2, maxLength: 80 },
      city: { type: 'string', minLength: 2, maxLength: 120 },
      neighborhood: { type: 'string', maxLength: 120 },
      addressLine: { type: 'string', maxLength: 255 },
      paymentAmount: { type: 'number', exclusiveMinimum: 0 },
      startAt: { type: 'string', format: 'date-time' },
      endAt: { type: 'string', format: 'date-time' },
      slots: { type: 'integer', minimum: 1, maximum: 100 },
      notes: { type: 'string', maxLength: 500 },
    },
  },
}

export const listJobsSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: jobStatusEnum },
      city: { type: 'string', minLength: 2, maxLength: 120 },
      category: { type: 'string', minLength: 2, maxLength: 80 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      offset: { type: 'integer', minimum: 0 },
    },
  },
}

export const updateJobStatusSchema = {
  params: idParamSchema,
  body: {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: jobStatusEnum },
    },
  },
}

export const applyToJobSchema = {
  params: jobIdParamSchema,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string', maxLength: 500 },
    },
  },
}

export const updateApplicationStatusSchema = {
  params: idParamSchema,
  body: {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
    },
  },
}

export const createReviewSchema = {
  params: jobIdParamSchema,
  body: {
    type: 'object',
    required: ['rating'],
    additionalProperties: false,
    properties: {
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      revieweeId: { type: 'string', minLength: 1, maxLength: 50 },
      comment: { type: 'string', maxLength: 500 },
    },
  },
}
