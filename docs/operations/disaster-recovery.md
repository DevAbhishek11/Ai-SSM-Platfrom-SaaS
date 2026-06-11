# Disaster Recovery Plan

## Targets

- RTO: under 4 hours.
- RPO: under 1 hour.
- Critical data: users, memberships, workspaces, posts, social account metadata, audit logs, billing records.

## Backups

- PostgreSQL: daily full backup and hourly WAL archiving.
- Object storage: versioning and cross-region replication.
- Secrets: managed secret store backup and break-glass access process.
- Infrastructure: Terraform state with locked remote backend.

## Restore Procedure

1. Declare incident severity and freeze deployments.
2. Restore PostgreSQL to latest safe point-in-time.
3. Restore object storage replication state.
4. Rehydrate Redis queues from durable job/event store where possible.
5. Deploy API/web to recovery region.
6. Run data consistency checks.
7. Shift DNS or gateway traffic.
8. Notify customers and publish post-incident report.

## Test Cadence

- Quarterly restore drill.
- Semiannual region failover simulation.
- Annual security incident tabletop.
