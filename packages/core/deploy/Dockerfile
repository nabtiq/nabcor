# nabcor site — Next.js standalone, non-root runtime.
# Parameterized port of the josouralazl/nabtiq Dockerfile the audit found
# re-authored four times. Copy into an app and it works unchanged; the only
# app-specific requirement is `output: 'standalone'` in next.config.
#
# Build context is the MONOREPO ROOT (workspaces resolve there):
#   docker build -f apps/<site>/Dockerfile -t <site> .

# ---- deps (whole workspace, so @nabcor/* resolve) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG SITE=demo
ARG GIT_SHA=unknown
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_ID=$GIT_SHA
RUN npm run build --workspace apps/$SITE

# ---- minimal runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ARG SITE=demo
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 nextjs
# Next standalone output includes a self-contained server.js + traced node_modules.
COPY --from=build --chown=nextjs:nodejs /app/apps/$SITE/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/$SITE/.next/static ./apps/$SITE/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/$SITE/public ./apps/$SITE/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/demo/server.js"]
