const seedAccounts = {
  business: {
    email: 'bar.centro@escalalivre.dev',
    password: '123456',
    role: 'BUSINESS',
    name: 'Carlos do Bar',
    city: 'Sao Jose dos Campos',
    businessName: 'Bar do Centro',
    category: 'bar',
  },
  worker: {
    email: 'maria@escalalivre.dev',
    password: '123456',
    role: 'WORKER',
    name: 'Maria Oliveira',
    city: 'Sao Jose dos Campos',
    functions: 'garcom, atendente',
  },
}

const navConfig = {
  WORKER: [
    { id: 'overview', label: 'Visao geral' },
    { id: 'discover', label: 'Descobrir vagas' },
    { id: 'applications', label: 'Minhas candidaturas' },
    { id: 'profile', label: 'Perfil' },
  ],
  BUSINESS: [
    { id: 'overview', label: 'Visao geral' },
    { id: 'discover', label: 'Marketplace' },
    { id: 'business-jobs', label: 'Minhas vagas' },
    { id: 'create-job', label: 'Publicar vaga' },
    { id: 'profile', label: 'Perfil' },
  ],
}

const state = {
  token: localStorage.getItem('escalaLivreToken') || '',
  user: loadStoredUser(),
  jobs: [],
  selectedJob: null,
  applications: [],
  authMode: 'login',
  selectedPersona: 'WORKER',
  currentView: 'overview',
  filters: {
    city: '',
    category: '',
  },
}

const elements = {
  authScreen: document.querySelector('#auth-screen'),
  appShell: document.querySelector('#app-shell'),
  apiStatus: document.querySelector('#api-status'),
  apiStatusDetail: document.querySelector('#api-status-detail'),
  authTitle: document.querySelector('#auth-title'),
  authHintTitle: document.querySelector('#auth-hint-title'),
  authHintCopy: document.querySelector('#auth-hint-copy'),
  personaWorker: document.querySelector('#persona-worker'),
  personaBusiness: document.querySelector('#persona-business'),
  authForm: document.querySelector('#auth-form'),
  authModeLogin: document.querySelector('#auth-mode-login'),
  authModeRegister: document.querySelector('#auth-mode-register'),
  authSubmit: document.querySelector('#auth-submit'),
  authEmail: document.querySelector('#auth-email'),
  authPassword: document.querySelector('#auth-password'),
  registerRole: document.querySelector('#register-role'),
  registerName: document.querySelector('#register-name'),
  registerCity: document.querySelector('#register-city'),
  registerBusinessName: document.querySelector('#register-business-name'),
  registerCategory: document.querySelector('#register-category'),
  registerFunctions: document.querySelector('#register-functions'),
  fieldRole: document.querySelector('#field-role'),
  fieldName: document.querySelector('#field-name'),
  fieldCity: document.querySelector('#field-city'),
  fieldBusinessName: document.querySelector('#field-business-name'),
  fieldBusinessCategory: document.querySelector('#field-business-category'),
  fieldWorkerFunctions: document.querySelector('#field-worker-functions'),
  authFeedback: document.querySelector('#auth-feedback'),
  appGreeting: document.querySelector('#app-greeting'),
  topbarSubtitle: document.querySelector('#topbar-subtitle'),
  sessionBadge: document.querySelector('#session-badge'),
  logoutButton: document.querySelector('#logout-button'),
  navList: document.querySelector('#nav-list'),
  refreshJobs: document.querySelector('#refresh-jobs'),
  filterCity: document.querySelector('#filter-city'),
  filterCategory: document.querySelector('#filter-category'),
  applyFilters: document.querySelector('#apply-filters'),
  discoverHintTitle: document.querySelector('#discover-hint-title'),
  discoverHintCopy: document.querySelector('#discover-hint-copy'),
  primaryCta: document.querySelector('#primary-cta'),
  overviewPanel: document.querySelector('#overview-panel'),
  jobsList: document.querySelector('#jobs-list'),
  jobDetails: document.querySelector('#job-details'),
  applicationsList: document.querySelector('#applications-list'),
  businessJobsList: document.querySelector('#business-jobs-list'),
  profilePanel: document.querySelector('#profile-panel'),
  appFeedback: document.querySelector('#app-feedback'),
  jobForm: document.querySelector('#job-form'),
  jobTitle: document.querySelector('#job-title'),
  jobDescription: document.querySelector('#job-description'),
  jobCategory: document.querySelector('#job-category'),
  jobCity: document.querySelector('#job-city'),
  jobNeighborhood: document.querySelector('#job-neighborhood'),
  jobPayment: document.querySelector('#job-payment'),
  jobStartAt: document.querySelector('#job-start-at'),
  jobEndAt: document.querySelector('#job-end-at'),
  jobSlots: document.querySelector('#job-slots'),
  jobStepper: document.querySelector('#job-stepper'),
  jobTemplate: document.querySelector('#job-item-template'),
  views: {
    overview: document.querySelector('#view-overview'),
    discover: document.querySelector('#view-discover'),
    applications: document.querySelector('#view-applications'),
    'business-jobs': document.querySelector('#view-business-jobs'),
    'create-job': document.querySelector('#view-create-job'),
    profile: document.querySelector('#view-profile'),
  },
}

function loadStoredUser() {
  const raw = localStorage.getItem('escalaLivreUser')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function persistSession() {
  if (state.token) localStorage.setItem('escalaLivreToken', state.token)
  else localStorage.removeItem('escalaLivreToken')

  if (state.user) localStorage.setItem('escalaLivreUser', JSON.stringify(state.user))
  else localStorage.removeItem('escalaLivreUser')
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

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

function currency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function dateLabel(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function toIsoLocal(value) {
  return new Date(value).toISOString()
}

function setFeedback(target, message, type = 'success') {
  target.textContent = message
  target.className = `feedback ${type}`
  target.classList.remove('hidden')
}

function clearFeedback(target) {
  target.className = 'feedback hidden'
  target.textContent = ''
}

function renderStatusTrack(status) {
  const order = ['PENDING', 'APPROVED']
  const labels = {
    PENDING: 'Enviada',
    APPROVED: 'Aprovada',
    REJECTED: 'Recusada',
  }

  if (status === 'REJECTED') {
    return `
      <div class="status-track">
        <span class="status-node done">Enviada</span>
        <span class="status-node current">Recusada</span>
      </div>
    `
  }

  const currentIndex = order.indexOf(status)

  return `
    <div class="status-track">
      ${order.map((item, index) => {
        const className = index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''
        return `<span class="status-node ${className}">${labels[item]}</span>`
      }).join('')}
    </div>
  `
}

function setPersona(role) {
  state.selectedPersona = role
  elements.personaWorker.classList.toggle('active', role === 'WORKER')
  elements.personaBusiness.classList.toggle('active', role === 'BUSINESS')
  elements.registerRole.value = role
  updateRegisterRoleFields()
  if (state.authMode === 'register') {
    setAuthMode('register')
  }
}

function setAuthMode(mode) {
  state.authMode = mode
  const isRegister = mode === 'register'
  const isBusinessPersona = state.selectedPersona === 'BUSINESS'
  elements.authTitle.textContent = isRegister ? 'Criar conta' : 'Entrar'
  elements.authSubmit.textContent = isRegister
    ? (isBusinessPersona ? 'Criar conta de comercio' : 'Criar conta de profissional')
    : 'Entrar'
  elements.authHintTitle.textContent = isRegister
    ? (isBusinessPersona ? 'Prepare seu comercio para publicar rapido' : 'Monte seu perfil para receber convites')
    : 'Entre para continuar'
  elements.authHintCopy.textContent = isRegister
    ? (isBusinessPersona
        ? 'Crie um acesso de comercio, informe o nome do estabelecimento e publique a primeira vaga sem depender de grupos informais.'
        : 'Crie seu perfil de profissional, informe cidade e funcoes principais para aparecer nas oportunidades certas.')
    : (isBusinessPersona
        ? 'Acesse sua operacao para publicar vagas, revisar candidatos e responder rapido quando surgir uma falta.'
        : 'Acesse sua conta para explorar vagas, acompanhar candidaturas e manter sua rotina de renda extra organizada.')
  elements.authModeLogin.classList.toggle('active', !isRegister)
  elements.authModeRegister.classList.toggle('active', isRegister)
  elements.fieldRole.classList.toggle('hidden', !isRegister)
  elements.fieldName.classList.toggle('hidden', !isRegister)
  elements.fieldCity.classList.toggle('hidden', !isRegister)
  if (isRegister) {
    elements.registerRole.value = state.selectedPersona
  }
  updateRegisterRoleFields()
}

function updateRegisterRoleFields() {
  const isRegister = state.authMode === 'register'
  const isBusiness = elements.registerRole.value === 'BUSINESS'
  elements.fieldBusinessName.classList.toggle('hidden', !isRegister || !isBusiness)
  elements.fieldBusinessCategory.classList.toggle('hidden', !isRegister || !isBusiness)
  elements.fieldWorkerFunctions.classList.toggle('hidden', !isRegister || isBusiness)
}

function setApiStatus(text, detail, ok = true) {
  elements.apiStatus.textContent = text
  elements.apiStatus.style.color = ok ? 'var(--success)' : 'var(--accent-dark)'
  elements.apiStatusDetail.textContent = detail
}

function showAppShell() {
  const loggedIn = Boolean(state.user && state.token)
  elements.authScreen.classList.toggle('hidden', loggedIn)
  elements.appShell.classList.toggle('hidden', !loggedIn)
}

function renderTopbar() {
  if (!state.user) return
  const name = state.user.role === 'BUSINESS'
    ? state.user.businessProfile?.businessName || state.user.name
    : state.user.name

  elements.appGreeting.textContent = state.user.role === 'BUSINESS'
    ? 'Painel do comercio'
    : 'Painel do profissional'
  elements.sessionBadge.textContent = `${name} · ${state.user.role}`
  elements.topbarSubtitle.textContent = state.user.role === 'BUSINESS'
    ? 'Publique vagas, acompanhe candidaturas e responda rapido quando a operacao apertar.'
    : 'Descubra vagas compativeis, acompanhe aprovacoes e mantenha sua disponibilidade organizada.'
}

function renderNavigation() {
  if (!state.user) return
  const items = navConfig[state.user.role] || []
  elements.navList.innerHTML = ''

  items.forEach((item) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `nav-button ${state.currentView === item.id ? 'active' : ''}`
    button.textContent = item.label
    button.addEventListener('click', () => {
      state.currentView = item.id
      renderNavigation()
      renderViews()
    })
    elements.navList.appendChild(button)
  })
}

function renderViews() {
  Object.entries(elements.views).forEach(([id, element]) => {
    element.classList.toggle('hidden', id !== state.currentView)
  })
}

function filteredJobs() {
  return state.jobs.filter((job) => {
    const cityMatch = !state.filters.city || job.city.toLowerCase().includes(state.filters.city.toLowerCase())
    const categoryMatch = !state.filters.category || job.category.toLowerCase().includes(state.filters.category.toLowerCase())
    return cityMatch && categoryMatch
  })
}

function renderOverview() {
  if (!state.user) {
    elements.primaryCta.innerHTML = ''
    elements.overviewPanel.innerHTML = ''
    return
  }

  const totalOpenJobs = state.jobs.filter((job) => job.status === 'OPEN').length
  const approvedApplications = state.applications.filter((application) => application.status === 'APPROVED').length

  if (state.user.role === 'WORKER') {
    const pendingApplications = state.applications.filter((application) => application.status === 'PENDING').length
    elements.primaryCta.innerHTML = `
      <strong>Proximo passo recomendado</strong>
      <p>Abra o marketplace para comparar cidade, horario e valor antes de enviar a proxima candidatura.</p>
      <button id="overview-cta-button" class="primary-button" type="button">Explorar vagas abertas</button>
    `
    elements.overviewPanel.innerHTML = `
      <article class="overview-card">
        <span class="meta-label">Agora</span>
        <strong>Voce tem ${state.applications.length} candidatura(s) no radar.</strong>
        <ul>
          <li>${approvedApplications} ja aprovada(s)</li>
          <li>${pendingApplications} aguardando resposta</li>
          <li>${totalOpenJobs} vaga(s) aberta(s) no marketplace</li>
          <li>Use "Descobrir vagas" para aplicar em novos turnos</li>
        </ul>
      </article>
      <article class="overview-card">
        <span class="meta-label">Proximo passo</span>
        <strong>Abra uma vaga e avalie rapidamente se o turno faz sentido.</strong>
        <ul>
          <li>confira cidade, horario e valor</li>
          <li>envie candidatura em um clique</li>
          <li>acompanhe resposta em "Minhas candidaturas"</li>
        </ul>
      </article>
    `
    document.querySelector('#overview-cta-button')?.addEventListener('click', () => {
      state.currentView = 'discover'
      renderNavigation()
      renderViews()
    })
    return
  }

  const ownedJobs = state.jobs.filter((job) => job.businessId === state.user.id)
  const openOwnedJobs = ownedJobs.filter((job) => job.status === 'OPEN').length
  const totalCandidates = ownedJobs.reduce((count, job) => count + (job._count?.applications || 0), 0)
  const upcomingJob = ownedJobs.find((job) => job.status === 'OPEN') || ownedJobs[0]
  const ctaLabel = ownedJobs.length ? 'Acompanhar minhas vagas' : 'Publicar primeira vaga'
  const nextView = ownedJobs.length ? 'business-jobs' : 'create-job'

  elements.primaryCta.innerHTML = `
    <strong>Proximo passo recomendado</strong>
    <p>${ownedJobs.length
      ? 'Entre nas suas vagas publicadas para revisar candidatos e decidir rapidamente quem assume o turno.'
      : 'Descreva a demanda, defina valor e horario e coloque sua primeira vaga no ar em poucos minutos.'}</p>
    <button id="overview-cta-button" class="primary-button" type="button">${ctaLabel}</button>
  `

  elements.overviewPanel.innerHTML = `
    <article class="overview-card">
      <span class="meta-label">Operacao</span>
      <strong>Voce tem ${ownedJobs.length} vaga(s) publicada(s).</strong>
      <ul>
        <li>${openOwnedJobs} ainda aberta(s)</li>
        <li>${totalCandidates} candidatura(s) acumulada(s)</li>
        <li>use "Publicar vaga" para novas demandas urgentes</li>
      </ul>
    </article>
    <article class="overview-card">
      <span class="meta-label">Foco imediato</span>
      <strong>${upcomingJob ? upcomingJob.title : 'Publique sua primeira vaga'}</strong>
      <ul>
        <li>${upcomingJob ? `${upcomingJob.city} · ${currency(upcomingJob.paymentAmount)}` : 'Defina cidade, valor e horario do turno'}</li>
        <li>veja como a vaga aparece para profissionais</li>
        <li>acompanhe suas vagas em "Minhas vagas"</li>
      </ul>
    </article>
  `

  document.querySelector('#overview-cta-button')?.addEventListener('click', () => {
    state.currentView = nextView
    renderNavigation()
    renderViews()
  })
}

function updateJobStepper() {
  const values = [
    Boolean(elements.jobTitle.value.trim() && elements.jobDescription.value.trim()),
    Boolean(elements.jobCategory.value.trim() && elements.jobCity.value.trim() && elements.jobPayment.value),
    Boolean(elements.jobStartAt.value && elements.jobEndAt.value && elements.jobSlots.value),
  ]

  const steps = elements.jobStepper?.querySelectorAll('.step') || []
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === values.findIndex((value) => !value))
  })

  if (values.every(Boolean) && steps.length) {
    steps.forEach((step) => step.classList.remove('active'))
    steps[2].classList.add('active')
  }
}

function renderJobsList() {
  const jobs = filteredJobs()
  elements.jobsList.innerHTML = ''

  if (!jobs.length) {
    elements.jobsList.innerHTML = '<p class="empty-state">Nenhuma vaga encontrada com os filtros atuais.</p>'
    elements.jobDetails.innerHTML = '<p class="empty-state">Ajuste os filtros ou limpe a busca para voltar a explorar vagas.</p>'
    return
  }

  jobs.forEach((job) => {
    const fragment = elements.jobTemplate.content.cloneNode(true)
    fragment.querySelector('.card-title').textContent = job.title
    fragment.querySelector('.card-meta').textContent = `${job.city} · ${job.category} · ${dateLabel(job.startAt)}`
    fragment.querySelector('.card-copy').textContent = job.description
    fragment.querySelector('.card-value').textContent = currency(job.paymentAmount)

    const status = fragment.querySelector('.status-pill')
    status.textContent = job.status
    status.classList.add(`status-${job.status.toLowerCase()}`)

    fragment.querySelector('.view-job-button').addEventListener('click', () => selectJob(job.id))
    elements.jobsList.appendChild(fragment)
  })
}

function workerAlreadyApplied(job) {
  return Array.isArray(job.applications) && job.applications.some((application) => application.workerId === state.user?.id)
}

function renderJobDetails() {
  const job = state.selectedJob

  if (!job) {
    elements.jobDetails.innerHTML = '<p class="empty-state">Selecione uma vaga para ver detalhes.</p>'
    return
  }

  const action = state.user?.role === 'WORKER' && job.status === 'OPEN'
    ? (workerAlreadyApplied(job)
        ? '<span class="session-badge">Candidatura enviada</span>'
        : '<button id="apply-job" class="primary-button" type="button">Candidatar-se</button>')
    : ''

  const applications = Array.isArray(job.applications) && job.applications.length
    ? job.applications.map((application) => `
        <div class="application-row">
          <div>
            <strong>${application.worker?.name || 'Profissional'}</strong>
            <p class="mini-copy">${application.message || 'Sem mensagem'}</p>
            ${renderStatusTrack(application.status)}
          </div>
          <div>
            <span class="status-pill status-${application.status.toLowerCase()}">${application.status}</span>
            ${state.user?.role === 'BUSINESS' && application.status === 'PENDING'
              ? `<button class="ghost-button approve-application" data-id="${application.id}" type="button">Aprovar</button>`
              : ''}
          </div>
        </div>
      `).join('')
    : '<p class="empty-state">Nenhuma candidatura nessa vaga ainda.</p>'

  elements.jobDetails.innerHTML = `
    <div class="detail-block">
      <span class="meta-label">Vaga</span>
      <h3>${job.title}</h3>
      <p class="profile-copy">${job.description}</p>
    </div>
    <div class="meta-grid">
      <div class="detail-block">
        <span class="meta-label">Pagamento</span>
        <strong>${currency(job.paymentAmount)}</strong>
      </div>
      <div class="detail-block">
        <span class="meta-label">Status</span>
        <strong>${job.status}</strong>
      </div>
      <div class="detail-block">
        <span class="meta-label">Inicio</span>
        <strong>${dateLabel(job.startAt)}</strong>
      </div>
      <div class="detail-block">
        <span class="meta-label">Local</span>
        <strong>${job.city}</strong>
        <p class="mini-copy">${job.neighborhood || 'Bairro nao informado'}</p>
      </div>
    </div>
    <div class="detail-block">
      <div class="card-row align-center">
        <div>
          <span class="meta-label">Comercio</span>
          <strong>${job.business?.businessProfile?.businessName || job.business?.name || 'Comercio'}</strong>
        </div>
        ${action}
      </div>
    </div>
    <div class="detail-block">
      <span class="meta-label">Candidaturas</span>
      ${applications}
    </div>
  `

  document.querySelector('#apply-job')?.addEventListener('click', applyToSelectedJob)
  document.querySelectorAll('.approve-application').forEach((button) => {
    button.addEventListener('click', () => approveApplication(button.dataset.id))
  })
}

function renderApplicationsView() {
  elements.applicationsList.innerHTML = state.applications.length
    ? state.applications.map((application) => `
        <article class="list-card">
          <div class="card-row">
            <div>
              <h4 class="card-title">${application.job.title}</h4>
              <p class="card-meta">${application.job.city} · ${dateLabel(application.job.startAt)}</p>
            </div>
            <span class="status-pill status-${application.status.toLowerCase()}">${application.status}</span>
          </div>
          <p class="card-copy">${currency(application.job.paymentAmount)}</p>
          ${renderStatusTrack(application.status)}
        </article>
      `).join('')
    : '<p class="empty-state">Voce ainda nao se candidatou. Abra "Descobrir vagas" para iniciar.</p>'
}

function renderBusinessJobsView() {
  const jobs = state.jobs.filter((job) => job.businessId === state.user?.id)
  elements.businessJobsList.innerHTML = jobs.length
    ? jobs.map((job) => `
        <article class="list-card">
          <div class="card-row">
            <div>
              <h4 class="card-title">${job.title}</h4>
              <p class="card-meta">${job.city} · ${job.category}</p>
            </div>
            <span class="status-pill status-${job.status.toLowerCase()}">${job.status}</span>
          </div>
          <p class="card-copy">${currency(job.paymentAmount)} · ${job._count?.applications || 0} candidatura(s)</p>
        </article>
      `).join('')
    : '<p class="empty-state">Nenhuma vaga publicada ainda. Va para "Publicar vaga" para criar a primeira.</p>'
}

function renderProfile() {
  if (!state.user) {
    elements.profilePanel.innerHTML = '<p class="empty-state">Sem sessao ativa.</p>'
    return
  }

  const extra = state.user.role === 'BUSINESS'
    ? `
      <div class="detail-block">
        <span class="meta-label">Comercio</span>
        <strong>${state.user.businessProfile?.businessName || '-'}</strong>
        <p class="mini-copy">${state.user.businessProfile?.category || '-'}</p>
      </div>
    `
    : `
      <div class="detail-block">
        <span class="meta-label">Funcoes</span>
        <strong>${state.user.workerProfile?.functions?.join(', ') || '-'}</strong>
      </div>
    `

  elements.profilePanel.innerHTML = `
    <div class="detail-block">
      <span class="meta-label">Nome</span>
      <strong>${state.user.name}</strong>
      <p class="mini-copy">${state.user.email}</p>
    </div>
    <div class="detail-block">
      <span class="meta-label">Cidade</span>
      <strong>${state.user.city}</strong>
      <p class="mini-copy">${state.user.phone || 'Sem telefone'}</p>
    </div>
    ${extra}
  `
}

async function refreshData() {
  state.jobs = (await apiRequest('/jobs')).jobs
  state.applications = state.user?.role === 'WORKER'
    ? (await apiRequest('/applications/mine')).applications
    : []
  if (!state.selectedJob) {
    const firstJob = filteredJobs()[0]
    state.selectedJob = firstJob || null
  } else {
    const refreshedSelectedJob = state.jobs.find((job) => job.id === state.selectedJob.id)
    state.selectedJob = refreshedSelectedJob || state.selectedJob
  }
  renderOverview()
  renderJobsList()
  if (state.selectedJob) {
    await selectJob(state.selectedJob.id)
  } else {
    renderJobDetails()
  }
  renderApplicationsView()
  renderBusinessJobsView()
  renderProfile()
}

async function selectJob(jobId) {
  try {
    state.selectedJob = (await apiRequest(`/jobs/${jobId}`)).job
    renderJobDetails()
  } catch (error) {
    setFeedback(elements.appFeedback, error.message, 'error')
  }
}

async function applyToSelectedJob() {
  if (!state.selectedJob) return
  try {
    await apiRequest(`/jobs/${state.selectedJob.id}/applications`, {
      method: 'POST',
      body: { message: 'Disponivel para assumir o turno.' },
    })
    setFeedback(elements.appFeedback, 'Candidatura enviada com sucesso.')
    await refreshData()
    await selectJob(state.selectedJob.id)
  } catch (error) {
    setFeedback(elements.appFeedback, error.message, 'error')
  }
}

async function approveApplication(applicationId) {
  try {
    await apiRequest(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    })
    setFeedback(elements.appFeedback, 'Candidatura aprovada com sucesso.')
    await refreshData()
    if (state.selectedJob) await selectJob(state.selectedJob.id)
  } catch (error) {
    setFeedback(elements.appFeedback, error.message, 'error')
  }
}

async function submitAuth(event) {
  event.preventDefault()
  clearFeedback(elements.authFeedback)

  try {
    if (state.authMode === 'login') {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          email: elements.authEmail.value,
          password: elements.authPassword.value,
        },
      })
      state.token = data.token
      state.user = data.user
    } else {
      const payload = {
        role: elements.registerRole.value,
        name: elements.registerName.value,
        email: elements.authEmail.value,
        password: elements.authPassword.value,
        city: elements.registerCity.value,
      }

      if (payload.role === 'BUSINESS') {
        payload.businessName = elements.registerBusinessName.value
        payload.category = elements.registerCategory.value
      } else {
        payload.functions = elements.registerFunctions.value
      }

      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: payload,
      })
      state.token = data.token
      state.user = data.user
    }

    state.currentView = 'overview'
    persistSession()
    showAppShell()
    renderTopbar()
    renderNavigation()
    renderViews()
    await refreshData()
    setFeedback(elements.appFeedback, `Sessao iniciada como ${state.user.role}.`)
  } catch (error) {
    setFeedback(elements.authFeedback, error.message, 'error')
  }
}

async function createJob(event) {
  event.preventDefault()
  clearFeedback(elements.appFeedback)

  try {
    await apiRequest('/jobs', {
      method: 'POST',
      body: {
        title: elements.jobTitle.value,
        description: elements.jobDescription.value,
        category: elements.jobCategory.value,
        city: elements.jobCity.value,
        neighborhood: elements.jobNeighborhood.value,
        paymentAmount: Number(elements.jobPayment.value),
        startAt: toIsoLocal(elements.jobStartAt.value),
        endAt: toIsoLocal(elements.jobEndAt.value),
        slots: Number(elements.jobSlots.value),
      },
    })
    elements.jobForm.reset()
    elements.jobSlots.value = 1
    setFeedback(elements.appFeedback, 'Vaga publicada com sucesso.')
    state.currentView = 'business-jobs'
    renderNavigation()
    renderViews()
    await refreshData()
  } catch (error) {
    setFeedback(elements.appFeedback, error.message, 'error')
  }
}

function logout() {
  state.token = ''
  state.user = null
  state.jobs = []
  state.selectedJob = null
  state.applications = []
  state.currentView = 'overview'
  persistSession()
  showAppShell()
  clearFeedback(elements.authFeedback)
  clearFeedback(elements.appFeedback)
}

function fillSeed(type) {
  const seed = seedAccounts[type]
  setPersona(seed.role)
  elements.authEmail.value = seed.email
  elements.authPassword.value = seed.password
  elements.registerRole.value = seed.role
  elements.registerName.value = seed.name
  elements.registerCity.value = seed.city
  elements.registerBusinessName.value = seed.businessName || ''
  elements.registerCategory.value = seed.category || ''
  elements.registerFunctions.value = seed.functions || ''
  updateRegisterRoleFields()
}

async function checkHealth() {
  try {
    const data = await apiRequest('/health')
    setApiStatus('Online', `${data.service} · ${new Date(data.timestamp).toLocaleString('pt-BR')}`)
  } catch (error) {
    setApiStatus('Falha', error.message, false)
  }
}

async function restoreSession() {
  if (!state.token) return
  try {
    const response = await apiRequest('/auth/me')
    state.user = response.user
    persistSession()
    showAppShell()
    renderTopbar()
    renderNavigation()
    renderViews()
    await refreshData()
  } catch {
    logout()
  }
}

elements.authForm.addEventListener('submit', submitAuth)
elements.personaWorker.addEventListener('click', () => setPersona('WORKER'))
elements.personaBusiness.addEventListener('click', () => setPersona('BUSINESS'))
elements.authModeLogin.addEventListener('click', () => setAuthMode('login'))
elements.authModeRegister.addEventListener('click', () => setAuthMode('register'))
elements.registerRole.addEventListener('change', updateRegisterRoleFields)
elements.logoutButton.addEventListener('click', logout)
elements.refreshJobs.addEventListener('click', async () => {
  await refreshData()
  if (state.selectedJob) await selectJob(state.selectedJob.id)
})
elements.applyFilters.addEventListener('click', () => {
  state.filters.city = elements.filterCity.value.trim()
  state.filters.category = elements.filterCategory.value.trim()
  state.selectedJob = filteredJobs()[0] || null
  renderJobsList()
  renderJobDetails()
})
elements.jobForm.addEventListener('submit', createJob)
;[
  elements.jobTitle,
  elements.jobDescription,
  elements.jobCategory,
  elements.jobCity,
  elements.jobPayment,
  elements.jobStartAt,
  elements.jobEndAt,
  elements.jobSlots,
].forEach((field) => field?.addEventListener('input', updateJobStepper))
document.querySelectorAll('.seed-button').forEach((button) => {
  button.addEventListener('click', () => fillSeed(button.dataset.seed))
})

setPersona('WORKER')
setAuthMode('login')
showAppShell()
updateJobStepper()
await checkHealth()
await restoreSession()
