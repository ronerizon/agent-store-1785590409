import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Redis is provisioned alongside this app by the platform (REDIS_URL). When it
// is present the cache / event-bus / workflow-engine modules are backed by it
// instead of the in-memory defaults — which is what makes a restart, or a
// second instance, safe. Without REDIS_URL (local `medusa develop`) the stock
// in-memory modules load, so the same config works on a laptop.
const redisUrl = process.env.REDIS_URL

const redisModules = redisUrl
  ? [
      { resolve: '@medusajs/medusa/cache-redis', options: { redisUrl } },
      { resolve: '@medusajs/medusa/event-bus-redis', options: { redisUrl } },
      {
        resolve: '@medusajs/medusa/workflow-engine-redis',
        options: { redis: { url: redisUrl } },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // The app reaches Postgres over the platform's private network, where the
    // database does not terminate TLS. Explicit so a driver default can never
    // turn this into a confusing connection error.
    databaseDriverOptions: { connection: { ssl: false } },
    redisUrl,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
  },
  modules: redisModules,
})
