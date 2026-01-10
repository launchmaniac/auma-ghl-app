# Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
# AUMA Multi-Package Dockerfile
# Usage: docker build --build-arg PACKAGE=backend .

ARG PACKAGE=backend

# Base stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
ARG PACKAGE
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/${PACKAGE}/package.json ./packages/${PACKAGE}/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Build stage for backend
FROM base AS build-backend
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN pnpm build
WORKDIR /app/packages/backend
RUN pnpm build

# Build stage for frontend apps (Vue)
FROM base AS build-frontend
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/frontend ./packages/frontend
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN pnpm build
WORKDIR /app/packages/frontend
RUN pnpm build

FROM base AS build-portal
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/portal/node_modules ./packages/portal/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/portal ./packages/portal
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN pnpm build
WORKDIR /app/packages/portal
RUN pnpm build

FROM base AS build-admin
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/admin/node_modules ./packages/admin/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/admin ./packages/admin
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN pnpm build
WORKDIR /app/packages/admin
RUN pnpm build

# Production stage for backend
FROM node:20-alpine AS production-backend
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=build-backend /app/packages/backend/dist ./dist
COPY --from=build-backend /app/packages/backend/package.json ./
COPY --from=deps /app/packages/backend/node_modules ./node_modules
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/app.js"]

# Production stage for static apps (nginx)
FROM nginx:alpine AS production-frontend
COPY --from=build-frontend /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM nginx:alpine AS production-portal
COPY --from=build-portal /app/packages/portal/dist /usr/share/nginx/html
COPY packages/portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM nginx:alpine AS production-admin
COPY --from=build-admin /app/packages/admin/dist /usr/share/nginx/html
COPY packages/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Default to backend
FROM production-backend AS production
