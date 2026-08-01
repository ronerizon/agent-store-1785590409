# Medusa v2 backend — multi-stage so the runtime image carries the built
# server and production dependencies only. Node 20 is what the starter's
# engines field requires.
#
# `medusa build` emits a self-contained app under .medusa/server (its own
# package.json), which is what actually runs — hence the second install inside
# that directory rather than shipping the build tree.

FROM node:20-alpine AS build
WORKDIR /app

# Toolchain for native addons some Medusa deps still compile.
RUN apk add --no-cache python3 make g++

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
RUN npx medusa build


FROM node:20-alpine AS runtime
WORKDIR /app

# curl backs the HEALTHCHECK below; Coolify surfaces it as running:healthy,
# which the platform polls while provisioning.
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=9000

COPY --from=build /app/.medusa/server ./
RUN npm install --omit=dev --no-audit --no-fund

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=10 \
  CMD curl -fsS http://127.0.0.1:9000/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
