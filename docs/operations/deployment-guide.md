# Deployment Guide

## Local Development

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Start dependencies with `docker compose up -d postgres redis`.
4. Run migrations with `npm run db:migrate`.
5. Start API with `npm run dev:api`.
6. Start web with `npm run dev:web`.

## Production Build

```powershell
npm ci
npm run typecheck
npm run test
npm run build
```

## Required Secrets

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY_BASE64`
- OAuth client secrets per social platform
- SSO/SAML provider metadata per enterprise tenant
- Stripe secret key and webhook signing secret
- Object storage access key and bucket config

## Kubernetes Rollout

1. Apply namespace, config maps, and secrets.
2. Apply database migration job.
3. Deploy API and web workloads.
4. Run smoke checks: `/api/health`, `/api/ready`, `/docs-json`, dashboard render.
5. Shift ingress traffic with canary weights.
6. Watch error rate, p95 latency, queue depth, and publish success rate.

## Rollback

- Roll back stateless deployments with `kubectl rollout undo`.
- Database migrations must be backward-compatible for one release.
- Disable risky features with feature flags before rolling back code.
