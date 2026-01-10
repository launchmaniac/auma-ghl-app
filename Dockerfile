# Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
# AUMA Backend Dockerfile

FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy everything needed for install and build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Install and build (force dev mode to include devDependencies like tsup)
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @auma/shared build
RUN pnpm --filter @auma/backend build

# Create production deployment using pnpm deploy
RUN pnpm --filter @auma/backend deploy --prod /app/deploy

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=build /app/deploy ./
RUN mkdir -p logs && chown -R nodejs:nodejs /app
USER nodejs
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/app.js"]
