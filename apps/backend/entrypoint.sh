#!/bin/sh
# Backend container entrypoint.
#
# Order matters and every step is idempotent, because this runs on EVERY start
# (a redeploy, a crash-restart, a scale event):
#
#   1. db:migrate  — brings the schema to the code's expectation. On a fresh
#                    database this creates it; on an existing one it is a no-op
#                    unless the Medusa version moved.
#   2. bootstrap   — admin user + publishable key (see src/scripts/bootstrap.ts).
#                    Never fatal: a store that can't create its admin should
#                    still serve, so an operator can fix it by hand.
#   3. start       — the server.
#
# A migration failure IS fatal: serving against a schema the code cannot use
# produces confusing 500s instead of one clear error in the deploy log.
set -e

echo "cauchy: running database migrations…"
npx medusa db:migrate

# `medusa build` compiles src/ to JS, but the extension of the emitted script
# has moved between Medusa releases — try the compiled path first, then the
# source path, so a version bump can't silently skip the bootstrap.
echo "cauchy: running bootstrap (admin user + publishable key)…"
if [ -f ./src/scripts/bootstrap.js ]; then
  npx medusa exec ./src/scripts/bootstrap.js || \
    echo "cauchy: bootstrap failed — the server will still start; see above"
elif [ -f ./src/scripts/bootstrap.ts ]; then
  npx medusa exec ./src/scripts/bootstrap.ts || \
    echo "cauchy: bootstrap failed — the server will still start; see above"
else
  echo "cauchy: WARNING no bootstrap script found — no admin user, no publishable key"
fi

echo "cauchy: starting Medusa…"
exec npx medusa start
