# syntax=docker/dockerfile:1
# Build context: repository root (see docker-compose.yml)

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @jamwave/server... --filter @jamwave/shared...
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @jamwave/server build
# Runtime deps only (the shared package is bundled into dist by tsup).
RUN node -e '\
const pkg = require("/repo/apps/server/package.json");\
const deps = Object.fromEntries(Object.entries(pkg.dependencies).filter(([, v]) => !String(v).startsWith("workspace:")));\
require("fs").writeFileSync("/repo/runtime.json", JSON.stringify({ name: pkg.name, private: true, type: "module", dependencies: deps }));'

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/runtime.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /repo/apps/server/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
