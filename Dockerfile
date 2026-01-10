# Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
# AUMA Backend Dockerfile

FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy everything needed for install and build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Install and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @auma/shared build
RUN pnpm --filter @auma/backend build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/packages/backend/dist ./dist
COPY --from=build /app/packages/backend/package.json ./
COPY --from=build /app/node_modules ./node_modules
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/app.js"]
