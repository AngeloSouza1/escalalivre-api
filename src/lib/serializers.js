export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    phone: user.phone,
    city: user.city,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    workerProfile: user.workerProfile || null,
    businessProfile: user.businessProfile || null,
  }
}

export function serializeJob(job) {
  return {
    ...job,
    paymentAmount: job.paymentAmount != null ? Number(job.paymentAmount) : null,
    applications: Array.isArray(job.applications)
      ? job.applications.map((application) => serializeApplication(application, { includeJob: false }))
      : job.applications,
  }
}

export function serializeApplication(application, options = {}) {
  const { includeJob = true } = options

  return {
    ...application,
    job: includeJob && application.job ? serializeJob(application.job) : application.job,
  }
}

export function serializeReview(review) {
  return {
    ...review,
    job: review.job ? serializeJob(review.job) : review.job,
  }
}
