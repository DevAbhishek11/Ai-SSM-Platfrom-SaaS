# Security Checklist

## Application

- Validate all request bodies with DTOs or Zod schemas.
- Enforce permission guards on every non-public endpoint.
- Require workspace membership for tenant-scoped resources.
- Use CSRF controls for cookie-based mutations.
- Use strict CORS allowlists.
- Apply Helmet/security headers.
- Rate-limit auth, AI generation, publishing, and webhook endpoints.
- Return stable error codes without leaking secrets.

## Data

- Encrypt OAuth tokens, refresh tokens, MFA secrets, and API keys.
- Hash refresh tokens and webhook secrets.
- Enable RLS on tenant-scoped tables.
- Store audit logs for privileged actions and expose scoped compliance export.
- Support GDPR export and deletion workflows.
- Avoid storing unnecessary AI prompts beyond retention policy.

## Infrastructure

- Use private networks for databases and queues.
- Rotate secrets through Vault or cloud secret manager.
- Scan dependencies on every pull request.
- Run SAST and container image scans.
- Enable WAF and DDoS protection at the edge.
- Use least-privilege IAM roles for workloads.

## Compliance

- GDPR and CCPA request handling.
- SOC 2 audit evidence for access, change, incident, and vendor management.
- Data residency design for enterprise tenants.
- Quarterly restore tests and annual incident simulation.
