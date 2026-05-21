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
RUN cd packages/database && npx prisma generate
RUN pnpm turbo run build --filter=@enterprise/api

# Production image
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
