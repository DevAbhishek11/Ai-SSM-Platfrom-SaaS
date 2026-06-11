# Admin Guide

## Workspace Setup

- Configure workspace name, slug, timezone, branding, and compliance settings.
- Review Settings > Billing and limits before launch windows; capacity-consuming actions are entitlement-checked.
- Invite members with the least privileged role required.
- Create API keys only for service integrations, scope them narrowly, send them as `x-api-key`, and revoke unused keys.
- Configure enterprise SSO connections, test metadata before enforcement, and disable stale connections.
- Connect social accounts through OAuth and confirm publish, insights, and comment scopes.
- Review connector events and rate-limit buckets before major campaign launch windows.
- Configure social listening monitors for brand, campaign, competitor, and crisis keywords.
- Define campaign milestones, task owners, and budget categories before publishing begins.
- Configure and version brand voice profiles before allowing AI-generated publishing.
- Configure AI safety policies with blocked terms, required disclosures, and maximum risk score.

## Governance

- Require approvals for regulated industries.
- Enable MFA for all admins and owners.
- Rotate API keys regularly.
- Review audit logs for privileged actions.
- Use Settings > Security audit to inspect login, workflow, connector, media, publishing, and webhook recovery events.
- Use Settings > Identity security to revoke suspicious sessions, trust known devices, and revoke lost devices.
- Configure notification channels for publishing failures and account issues.
- Keep mention notifications enabled for social operations owners and verify critical alerts route outside quiet hours.
- Review notification routing preferences and delivery attempts for urgent operational alerts.
- Review social listening thresholds before launches and resolve alerts only after response ownership is recorded.
- Generate campaign reports after major launch moments and before stakeholder readouts.
- Use Analytics > Reports and exports to create branded templates, schedule stakeholder delivery, generate exports, and issue time-bound share links.
- Review AI moderation queue items before approving blocked drafts for regulated campaigns.
- Monitor webhook retries and account-health alerts before campaign launch windows.
- Keep database readiness in `metadata` mode locally and `strict` mode in production.

## SSO

Enterprise tenants can configure SAML/OIDC metadata, domain mapping, role mapping, and forced SSO. Current admin controls support creating, testing, activating, and disabling workspace SSO connections, plus session and trusted-device response actions.
