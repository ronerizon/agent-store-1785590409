# Next.js storefront — multi-stage, standalone output (see next.config.js).
#
# NEXT_PUBLIC_* values are inlined by `next build`, so they arrive as build
# ARGs, not just runtime env. The platform sets them as BUILD-TIME variables on
# the Coolify app; a change to either one therefore needs a rebuild, not a
# restart. next.config.js also hard-fails the build when the publishable key is
# missing, which keeps a misconfigured store from shipping a broken storefront.

FROM node:20-alpine AS build
WORKDIR /app

# A lockfile makes this `npm ci` (reproducible, and far fewer registry
# requests); without one it falls back to `npm install`. The retry settings
# are not optional: a shared egress IP hits the npm registry's 429 rate limit
# quickly on a dependency tree this size, and the default 2 retries give up
# long before it clears.
#
# --include=dev is load-bearing: the deploy platform passes the app's env
# vars into the build, so a NODE_ENV=production there would make npm skip
# devDependencies — and the build NEEDS them (typescript/ts-node compile
# the .ts config and sources; without them the build fails with a baffling
# "Cannot find module '/app/medusa-config'").
COPY package.json package-lock.json* ./
RUN npm config set fetch-retries 8 \
 && npm config set fetch-retry-maxtimeout 180000 \
 && npm config set fetch-timeout 600000 \
 && (npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund)

COPY . .

ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:20-alpine AS runtime
WORKDIR /app

RUN for attempt in 1 2 3 4 5; do apk add --no-cache curl && exit 0; sleep 3; done; exit 1

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8000
ENV HOSTNAME=0.0.0.0

# standalone bundle + the two trees it deliberately excludes
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=10 \
  CMD curl -fsS http://127.0.0.1:8000/favicon.ico || exit 1

CMD ["node", "server.js"]
