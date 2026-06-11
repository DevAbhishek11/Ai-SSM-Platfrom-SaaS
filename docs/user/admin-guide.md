# Admin Guide

## Workspace Setup

- Configure workspace name, slug, timezone, branding, and compliance settings.
- Invite members with the least privileged role required.
- Connect social accounts and confirm scopes.
- Configure brand voice before allowing AI-generated publishing.

## Governance

- Require approvals for regulated industries.
- Enable MFA for all admins and owners.
- Rotate API keys regularly.
- Review audit logs for privileged actions.
- Configure notification channels for publishing failures and account issues.
- Monitor webhook retries and account-health alerts before campaign launch windows.
- Keep database readiness in `metadata` mode locally and `strict` mode in production.

## SSO

Enterprise tenants can configure SAML/OIDC metadata, domain mapping, role mapping, and forced SSO.
