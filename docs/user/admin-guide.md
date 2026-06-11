# Admin Guide

## Workspace Setup

- Configure workspace name, slug, timezone, branding, and compliance settings.
- Review Settings > Billing and limits before launch windows; capacity-consuming actions are entitlement-checked.
- Invite members with the least privileged role required.
- Create API keys only for service integrations, scope them narrowly, send them as `x-api-key`, and revoke unused keys.
- Connect social accounts through OAuth and confirm publish, insights, and comment scopes.
- Review connector events and rate-limit buckets before major campaign launch windows.
- Configure brand voice before allowing AI-generated publishing.

## Governance

- Require approvals for regulated industries.
- Enable MFA for all admins and owners.
- Rotate API keys regularly.
- Review audit logs for privileged actions.
- Use Settings > Security audit to inspect login, workflow, connector, media, publishing, and webhook recovery events.
- Configure notification channels for publishing failures and account issues.
- Review notification routing preferences and delivery attempts for urgent operational alerts.
- Monitor webhook retries and account-health alerts before campaign launch windows.
- Keep database readiness in `metadata` mode locally and `strict` mode in production.

## SSO

Enterprise tenants can configure SAML/OIDC metadata, domain mapping, role mapping, and forced SSO.
