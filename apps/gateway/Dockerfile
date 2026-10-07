# Base stage for dependencies
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY . .

# Install dependencies and build
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=gateway

# Production image
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/apps/gateway/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/gateway/package.json ./package.json

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=128"
EXPOSE 4000
CMD ["node", "dist/main.js"]
