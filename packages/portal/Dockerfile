# Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

# Base stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/portal/package.json ./packages/portal/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/portal/node_modules ./packages/portal/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/portal ./packages/portal
COPY packages/shared ./packages/shared
WORKDIR /app/packages/portal
EXPOSE 3002
CMD ["pnpm", "dev", "--host"]

# Build stage
FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/portal/node_modules ./packages/portal/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/portal ./packages/portal
COPY packages/shared ./packages/shared
WORKDIR /app/packages/portal
RUN pnpm build

# Production stage - nginx to serve static files
FROM nginx:alpine AS production
COPY --from=build /app/packages/portal/dist /usr/share/nginx/html
COPY packages/portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
