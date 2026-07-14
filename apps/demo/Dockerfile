# nabcor demo — Next.js standalone, non-root. Build context = monorepo ROOT:
#   docker build -f apps/demo/Dockerfile -t nabcor-demo .
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `prebuild` compiles @nabcor/core to dist first, then next build (standalone).
RUN npm run build --workspace apps/demo

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 nextjs
# Standalone server + traced deps, then static assets and public/ (fonts, media).
COPY --from=build --chown=nextjs:nodejs /app/apps/demo/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/demo/.next/static ./apps/demo/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/demo/public ./apps/demo/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/demo/server.js"]
