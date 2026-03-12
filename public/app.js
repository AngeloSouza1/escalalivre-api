const seedAccounts = {
  business: {
    email: 'bar.centro@escalalivre.dev',
    password: '123456',
  },
  worker: {
    email: 'maria@escalalivre.dev',
    password: '123456',
  },
}

const state = {
  token: localStorage.getItem('escalaLivreToken') || '',
  user: loadStoredUser(),
  jobs: [],
  selectedJob: null,
  dashboardApplications: [],
}

const elements = {
  apiStatus: document.querySelector('#api-status'),
  apiStatusDetail: document.querySelector('#api-status-detail'),
  apiBaseUrl: document.querySelector('#api-base-url'),
  loginForm: document.querySelector('#login-form'),
  email: document.querySelector('#email'),
  password: document.querySelector('#password'),
  authState: document.querySelector('#auth-state'),
  authMessage: document.querySelector('#auth-message'),
  logoutButton: document.querySelector('#logout-button'),
  refreshJobs: document.querySelector('#refresh-jobs'),
  jobsList: document.querySelector('#jobs-list'),
  jobDetails: document.querySelector('#job-details'),
  detailsTitle: document.querySelector('#details-title'),
  dashboardTitle: document.querySelector('#dashboard-title'),
  dashboardContent: document.querySelector('#dashboard-content'),
  jobTemplate: document.querySelector('#job-item-template'),
}

function loadStoredUser() {
  const raw = localStorage.getItem('escalaLivreUser')
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSession() {
  if (state.token) {
    localStorage.setItem('escalaLivreToken', state.token)
  } else {
    localStorage.removeItem('escalaLivreToken')
  }

  if (state.user) {
    localStorage.setItem('escalaLivreUser', JSON.stringify(state.user))
  } else {
    localStorage.removeItem('escalaLivreUser')
  }
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})

  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`)
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.error || 'Request failed'
    const details = data?.details?.map((item) => `${item.field}: ${item.message}`).join(' | ')
    throw new Error(details ? `${message} - ${details}` : message)
  }

  return data
}

function setFeedback(message, type = 'success') {
  elements.authMessage.textContent = message
  elements.authMessage.className = `feedback ${type}`
  elements.authMessage.classList.remove('hidden')
}

function clearFeedback() {
  elements.authMessage.className = 'feedback hidden'
  elements.authMessage.textContent = ''
}

function currency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function dateLabel(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function setApiStatus(text, detail, isOk = true) {
  elements.apiStatus.textContent = text
  elements.apiStatus.style.color = isOk ? 'var(--success)' : 'var(--accent-dark)'
  elements.apiStatusDetail.textContent = detail
  elements.apiBaseUrl.textContent = window.location.origin
}

function renderAuthState() {
  if (!state.user) {
    elements.authState.classList.add('hidden')
    elements.logoutButton.classList.add('hidden')
    return
  }

  elements.logoutButton.classList.remove('hidden')
  elements.authState.classList.remove('hidden')
  elements.authState.innerHTML = `
    <span class="meta-label">Sessao ativa</span>
    <strong>${state.user.name}</strong>
    <p class="mini-copy">${state.user.role} · ${state.user.email}</p>
  `
}

function renderJobs() {
  elements.jobsList.innerHTML = ''

  if (!state.jobs.length) {
    elements.jobsList.innerHTML = '<p class="empty-state">Nenhuma vaga aberta no momento.</p>'
    return
  }

  state.jobs.forEach((job) => {
    const fragment = elements.jobTemplate.content.cloneNode(true)
    fragment.querySelector('.job-title').textContent = job.title
    fragment.querySelector('.job-meta').textContent = `${job.city} · ${job.category} · ${dateLabel(job.startAt)}`
    fragment.querySelector('.job-description').textContent = job.description
    fragment.querySelector('.job-payment').textContent = currency(job.paymentAmount)

    const status = fragment.querySelector('.status-pill')
    status.textContent = job.status
    status.classList.add(`status-${job.status.toLowerCase().replaceAll('_', '-')}`)

    fragment.querySelector('.job-view-button').addEventListener('click', () => {
      selectJob(job.id)
    })

    elements.jobsList.appendChild(fragment)
  })
}

async function selectJob(jobId) {
  try {
    state.selectedJob = (await apiRequest(`/jobs/${jobId}`)).job
    renderJobDetails()
  } catch (error) {
    setFeedback(error.message, 'error')
  }
}

async function applyToSelectedJob() {
  if (!state.selectedJob) {
    return
  }

  try {
    await apiRequest(`/jobs/${state.selectedJob.id}/applications`, {
      method: 'POST',
      body: {
        message: 'Disponivel para assumir o turno.',
      },
    })

    setFeedback('Candidatura enviada com sucesso.')
    await refreshAll()
    await selectJob(state.selectedJob.id)
  } catch (error) {
    setFeedback(error.message, 'error')
  }
}

async function approveApplication(applicationId) {
  try {
    await apiRequest(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: {
        status: 'APPROVED',
      },
    })

    setFeedback('Candidatura aprovada com sucesso.')
    await refreshAll()
    if (state.selectedJob) {
      await selectJob(state.selectedJob.id)
    }
  } catch (error) {
    setFeedback(error.message, 'error')
  }
}

function renderJobDetails() {
  const job = state.selectedJob

  if (!job) {
    elements.detailsTitle.textContent = 'Selecione uma vaga'
    elements.jobDetails.innerHTML = '<p class="empty-state">Os detalhes da vaga aparecem aqui.</p>'
    return
  }

  elements.detailsTitle.textContent = job.title

  const actions = []
  if (state.user?.role === 'WORKER' && job.status === 'OPEN') {
    actions.push('<button id="apply-job-button" class="primary-button" type="button">Candidatar-se</button>')
  }

  const applicationsHtml = Array.isArray(job.applications) && job.applications.length
    ? job.applications.map((application) => `
        <div class="application-item">
          <div>
            <strong>${application.worker?.name || 'Profissional'}</strong>
            <p class="mini-copy">${application.message || 'Sem mensagem'}</p>
          </div>
          <div class="inline-row">
            <span class="status-pill status-${application.status.toLowerCase()}">${application.status}</span>
            ${state.user?.role === 'BUSINESS' && application.status === 'PENDING'
              ? `<button class="ghost-button approve-button" data-application-id="${application.id}" type="button">Aprovar</button>`
              : ''}
          </div>
        </div>
      `).join('')
    : '<p class="empty-state">Nenhuma candidatura registrada para esta vaga.</p>'

  elements.jobDetails.innerHTML = `
    <div class="detail-section">
      <p class="detail-copy">${job.description}</p>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <span class="meta-label">Pagamento</span>
        <strong>${currency(job.paymentAmount)}</strong>
      </div>
      <div class="mini-card">
        <span class="meta-label">Turno</span>
        <strong>${dateLabel(job.startAt)}</strong>
        <p class="mini-copy">ate ${dateLabel(job.endAt)}</p>
      </div>
      <div class="mini-card">
        <span class="meta-label">Local</span>
        <strong>${job.city}</strong>
        <p class="mini-copy">${job.neighborhood || 'Bairro nao informado'}</p>
      </div>
      <div class="mini-card">
        <span class="meta-label">Status</span>
        <strong>${job.status}</strong>
        <p class="mini-copy">${job.slots} vaga(s)</p>
      </div>
    </div>
    <div class="detail-section">
      <div class="inline-row">
        <div>
          <span class="meta-label">Comercio</span>
          <strong>${job.business?.businessProfile?.businessName || job.business?.name || 'Comercio'}</strong>
        </div>
        ${actions.join('')}
      </div>
    </div>
    <div class="detail-section">
      <span class="meta-label">Candidaturas</span>
      ${applicationsHtml}
    </div>
  `

  const applyButton = document.querySelector('#apply-job-button')
  if (applyButton) {
    applyButton.addEventListener('click', applyToSelectedJob)
  }

  document.querySelectorAll('.approve-button').forEach((button) => {
    button.addEventListener('click', () => {
      approveApplication(button.dataset.applicationId)
    })
  })
}

function renderDashboard() {
  if (!state.user) {
    elements.dashboardTitle.textContent = 'Aguardando login'
    elements.dashboardContent.innerHTML = '<p class="empty-state">Ao entrar, o painel muda para BUSINESS ou WORKER.</p>'
    return
  }

  if (state.user.role === 'WORKER') {
    elements.dashboardTitle.textContent = 'Painel do profissional'
    const applications = state.dashboardApplications

    elements.dashboardContent.innerHTML = applications.length
      ? applications.map((application) => `
          <div class="dashboard-panel">
            <span class="meta-label">${application.status}</span>
            <strong>${application.job.title}</strong>
            <p class="mini-copy">${application.job.city} · ${currency(application.job.paymentAmount)}</p>
          </div>
        `).join('')
      : '<p class="empty-state">Nenhuma candidatura feita ainda.</p>'

    return
  }

  elements.dashboardTitle.textContent = 'Painel do comercio'
  const ownedJobs = state.jobs.filter((job) => job.businessId === state.user.id)

  elements.dashboardContent.innerHTML = ownedJobs.length
    ? ownedJobs.map((job) => `
        <div class="dashboard-panel">
          <span class="meta-label">${job.status}</span>
          <strong>${job.title}</strong>
          <p class="mini-copy">${job.city} · ${currency(job.paymentAmount)} · ${job._count?.applications || 0} candidatura(s)</p>
        </div>
      `).join('')
    : '<p class="empty-state">Nenhuma vaga propria encontrada neste feed.</p>'
}

async function refreshDashboardData() {
  if (!state.user) {
    state.dashboardApplications = []
    return
  }

  if (state.user.role === 'WORKER') {
    state.dashboardApplications = (await apiRequest('/applications/mine')).applications
  } else {
    state.dashboardApplications = []
  }
}

async function refreshJobs() {
  state.jobs = (await apiRequest('/jobs')).jobs
}

async function refreshAll() {
  clearFeedback()
  await refreshJobs()
  await refreshDashboardData()
  renderJobs()
  renderDashboard()
}

async function restoreSession() {
  if (!state.token) {
    renderAuthState()
    return
  }

  try {
    const response = await apiRequest('/auth/me')
    state.user = response.user
    saveSession()
    renderAuthState()
    await refreshAll()
  } catch {
    state.token = ''
    state.user = null
    saveSession()
    renderAuthState()
  }
}

async function login(event) {
  event.preventDefault()

  try {
    clearFeedback()

    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: elements.email.value,
        password: elements.password.value,
      },
    })

    state.token = response.token
    state.user = response.user
    saveSession()
    renderAuthState()
    await refreshAll()
    setFeedback(`Sessao iniciada como ${state.user.role}.`)
  } catch (error) {
    setFeedback(error.message, 'error')
  }
}

function logout() {
  state.token = ''
  state.user = null
  state.jobs = []
  state.selectedJob = null
  state.dashboardApplications = []
  saveSession()
  renderAuthState()
  renderJobs()
  renderJobDetails()
  renderDashboard()
  clearFeedback()
}

async function checkHealth() {
  try {
    const data = await apiRequest('/health')
    setApiStatus('Online', `${data.service} · ${new Date(data.timestamp).toLocaleString('pt-BR')}`)
  } catch (error) {
    setApiStatus('Falha', error.message, false)
  }
}

elements.loginForm.addEventListener('submit', login)
elements.logoutButton.addEventListener('click', logout)
elements.refreshJobs.addEventListener('click', async () => {
  try {
    await refreshAll()
    if (state.selectedJob) {
      await selectJob(state.selectedJob.id)
    }
  } catch (error) {
    setFeedback(error.message, 'error')
  }
})

document.querySelectorAll('.seed-button').forEach((button) => {
  button.addEventListener('click', () => {
    const seed = seedAccounts[button.dataset.seed]
    elements.email.value = seed.email
    elements.password.value = seed.password
  })
})

renderAuthState()
renderJobs()
renderJobDetails()
renderDashboard()
await checkHealth()
await restoreSession()
