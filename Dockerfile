# Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/portal/package.json ./packages/portal/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
ARG VITE_API_URL=https://api.launchmaniac.com
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/portal ./packages/portal
COPY packages/shared ./packages/shared
RUN pnpm --filter @auma/shared build
RUN pnpm --filter @auma/portal build

FROM nginx:alpine AS production
COPY --from=build /app/packages/portal/dist /usr/share/nginx/html
COPY packages/portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
