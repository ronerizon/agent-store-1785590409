# cauchy-medusa-starter

Template for a Cauchy **Medusa store** workspace. Creating an App Builder
workspace with the `medusa` flavor generates a repo from this template and
provisions everything around it.

## Layout

```
apps/backend/     Medusa v2 — commerce API + admin dashboard (port 9000)
apps/storefront/  Next.js storefront (port 8000)
```

The two directories are deployed as **two separate applications** from this one
repo (Coolify base directories `/apps/backend` and `/apps/storefront`).

## Push = deploy

Every commit to the default branch redeploys **both** apps — backend first, so
the storefront always rebuilds against a live API. There is no pipeline file to
write.

## What the platform manages (do not hand-edit)

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL`, `REDIS_URL` | backend | managed Postgres + Redis |
| `JWT_SECRET`, `COOKIE_SECRET` | backend | rotating them logs everyone out |
| `MEDUSA_ADMIN_EMAIL` / `_PASSWORD` | backend | first-boot admin; reveal in the console |
| `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | backend | set from the real app URLs |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | storefront | **build-time** |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | storefront | **build-time** |

`NEXT_PUBLIC_*` values are inlined by `next build` — changing one needs a
rebuild, not a restart.

## First boot

`apps/backend/entrypoint.sh` runs on every start and is idempotent: database
migrations, then `src/scripts/bootstrap.ts` (creates the admin user, ensures a
publishable API key linked to the default sales channel, and prints it as
`CAUCHY_PUBLISHABLE_KEY=pk_…` for the platform to read).

## Working on the store

- Products, regions and shipping options: the admin dashboard at
  `<backend-url>/app`, or a script committed under `apps/backend/src/scripts/`
  run with `npx medusa exec`.
- Storefront look and feel: `apps/storefront/src` — ordinary Next.js.
- Custom commerce logic: Medusa modules/workflows under `apps/backend/src`.
