FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm install

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Browser calls the same-origin /api path; the server proxies it to API_PROXY_TARGET.
ENV NEXT_PUBLIC_API_URL=/api
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@ssm/domain
RUN npm run build --workspace=@ssm/web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV API_PROXY_TARGET=http://api:4000
ENV API_INTERNAL_URL=http://api:4000/api
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
