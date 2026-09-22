FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV CI=true
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/contracts/package.json packages/contracts/
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/contracts packages/contracts
COPY backend backend
COPY tsconfig.base.json ./
RUN pnpm --filter @wufud/contracts build && pnpm --filter backend build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN useradd -m wufud
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/src/migrations ./backend/src/migrations
USER wufud
WORKDIR /app/backend
EXPOSE 4005
CMD ["node", "dist/main.js"]
