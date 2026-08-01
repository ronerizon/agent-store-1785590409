import {
  ContainerRegistrationKeys,
  Modules,
} from '@medusajs/framework/utils'
import type { ExecArgs } from '@medusajs/framework/types'
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
} from '@medusajs/medusa/core-flows'

/**
 * First-boot bootstrap — runs on EVERY container start (see entrypoint.sh),
 * so every step must be idempotent.
 *
 * It does two things the platform needs and the stock starter doesn't do:
 *
 *  1. creates the admin user from MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD
 *     so the store is reachable the moment the app is green, with credentials
 *     the console can reveal;
 *  2. guarantees exactly one publishable API key linked to the default sales
 *     channel, and PRINTS IT on stdout as CAUCHY_PUBLISHABLE_KEY=pk_… — the
 *     storefront needs that key at build time, and the platform reads it back
 *     either from the admin API or (fallback) by scraping these logs;
 *  3. guarantees at least one REGION exists. This is not cosmetic: the
 *     storefront's middleware fetches /store/regions on every request and
 *     throws when the list is empty, so a store with no region serves nothing
 *     and its container never passes a health check.
 *
 * Never throws: a bootstrap failure must not stop the server from starting.
 * Anything it couldn't do is reported on stdout and can be redone by hand.
 */
export default async function bootstrap({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD

  // ── 1. admin user ────────────────────────────────────────────────
  if (email && password) {
    try {
      const userModule = container.resolve(Modules.USER)
      const existing = await userModule.listUsers({ email })
      if (existing.length > 0) {
        const auth = container.resolve(Modules.AUTH)
        await auth.updateProvider('emailpass', { entity_id: email, password })
        logger.info(`bootstrap: reset password for admin ${email}`)
      } else {
        const authModule = container.resolve(Modules.AUTH)
        // Register the emailpass identity first, then attach the user to it —
        // an admin row without an auth identity cannot log in.
        const { success, authIdentity, error } = await authModule.register(
          'emailpass',
          { body: { email, password } }
        )
        if (!success) {
          throw new Error(error || 'auth register failed')
        }
        const [user] = await userModule.createUsers([{ email }])
        await authModule.updateAuthIdentities([
          {
            id: authIdentity!.id,
            app_metadata: { user_id: user.id },
          },
        ])
        logger.info(`bootstrap: created admin ${email}`)
      }
    } catch (e) {
      logger.error(`bootstrap: admin user step failed: ${(e as Error).message}`)
    }
  } else {
    logger.warn('bootstrap: MEDUSA_ADMIN_EMAIL/PASSWORD unset — no admin created')
  }

  // ── 2. publishable key (+ sales-channel link) ────────────────────
  try {
    const apiKeyModule = container.resolve(Modules.API_KEY)
    const keys = await apiKeyModule.listApiKeys({ type: 'publishable' })

    let token = keys[0]?.token
    if (!token) {
      const { result } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: 'storefront', type: 'publishable', created_by: 'bootstrap' },
          ],
        },
      })
      token = result[0].token
      logger.info('bootstrap: created publishable key')
    }

    // Link it to the default sales channel, or /store requests 400 with
    // "Publishable key needs to have a sales channel configured".
    try {
      const scModule = container.resolve(Modules.SALES_CHANNEL)
      const channels = await scModule.listSalesChannels({}, { take: 1 })
      const linkable = container.resolve(ContainerRegistrationKeys.LINK)
      if (channels.length > 0 && token) {
        const key = (await apiKeyModule.listApiKeys({ token }))[0]
        await linkable.create({
          [Modules.API_KEY]: { publishable_key_id: key.id },
          [Modules.SALES_CHANNEL]: { sales_channel_id: channels[0].id },
        })
        logger.info(`bootstrap: linked key to sales channel ${channels[0].name}`)
      }
    } catch (e) {
      // Re-linking an existing pair throws; that is the idempotent path.
      logger.info(`bootstrap: sales-channel link skipped (${(e as Error).message})`)
    }

    // The contract with the platform. Keep this exact prefix — the
    // orchestrator greps it out of the container logs.
    console.log(`CAUCHY_PUBLISHABLE_KEY=${token}`)
  } catch (e) {
    logger.error(`bootstrap: publishable key step failed: ${(e as Error).message}`)
  }

  // ── 3. a region (the storefront cannot render without one) ───────
  try {
    const regionModule = container.resolve(Modules.REGION)
    const existing = await regionModule.listRegions({}, { take: 1 })
    if (existing.length > 0) {
      logger.info(`bootstrap: region "${existing[0].name}" already exists`)
    } else {
      // Country + currency match the storefront's default region ("us"), so
      // a visitor with no country prefix lands somewhere that resolves.
      const countries = ['us']
      await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: 'Default',
              currency_code: 'usd',
              countries,
              payment_providers: ['pp_system_default'],
            },
          ],
        },
      })
      // Without a tax region checkout fails at the tax-calculation step.
      await createTaxRegionsWorkflow(container).run({
        input: countries.map((country_code) => ({
          country_code,
          provider_id: 'tp_system',
        })),
      })
      logger.info('bootstrap: created default region (us/usd) + tax region')
    }
  } catch (e) {
    logger.error(`bootstrap: region step failed: ${(e as Error).message}`)
  }
}
