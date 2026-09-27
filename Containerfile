# Production image.
#
# Runs as-is with an empty database: the app creates and migrates it on startup (server/db/connect.ts).
# Persist /app/data (SQLite database + uploaded images) on a volume, or everything is lost on every redeploy.

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:26-bookworm-slim AS build

# Compilers for better-sqlite3: when no prebuilt binary matches this Node version, it builds from source.
# Only the build stage needs them; the runtime stage gets the compiled binary inside .output.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependency manifests first, so a source-only change does not reinstall.
COPY package.json package-lock.json ./

# Skip install scripts: Nuxt's postinstall (`nuxt prepare`) needs the source tree, which is not copied yet.
# better-sqlite3 does need its install script (it fetches the native binary), so it is rebuilt on its own.
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3

COPY . .

RUN npx nuxt prepare && npm run build

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
# Same base as the build stage, so the better-sqlite3 binary Nitro copied into .output matches this Node and libc.
FROM node:26-bookworm-slim AS runtime

# tini forwards SIGTERM to node (as PID 1, node would ignore it and the container would be killed after the
# stop timeout instead of shutting down cleanly).
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

WORKDIR /app

COPY --from=build /app/.output ./.output

# The migration SQL, which Nitro does NOT bundle into .output. It is read from ./drizzle relative to the working
# directory, so it must sit next to where the server starts. Without it, the app cannot create its tables.
COPY --from=build /app/drizzle ./drizzle

# The database and uploads (NUXT_DATA_DIR defaults to ./data). Mount a volume over it.
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

# Checks the DATABASE, not just the process (server/api/health.get.ts). Uses node's global fetch rather than curl,
# which the slim base image does not ship. NOTE: podman's default OCI image format DROPS this instruction; the
# build must pass `--format docker` (see .github/workflows/build-and-deploy.yml).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.NITRO_PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", ".output/server/index.mjs"]
