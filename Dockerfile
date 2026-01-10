# Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
# AUMA Admin Dockerfile

FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ARG VITE_API_URL=https://api.launchmaniac.com
ENV VITE_API_URL=$VITE_API_URL

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/admin/package.json ./packages/admin/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

COPY packages/admin ./packages/admin
COPY packages/shared ./packages/shared
RUN pnpm --filter @auma/shared build
RUN pnpm --filter @auma/admin build

FROM nginx:alpine AS production
COPY --from=build /app/packages/admin/dist /usr/share/nginx/html
COPY packages/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
