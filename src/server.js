import 'dotenv/config'
import { buildApp } from './app.js'

const app = buildApp()
const PORT = Number(process.env.PORT || 3000)

const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
    app.log.info(`API rodando na porta ${PORT}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()
