# Cost Estimate

Assumptions are directional and should be replaced with cloud-provider quotes before production purchasing.

| Scale | Monthly Infra Estimate | Primary Drivers |
| --- | ---: | --- |
| 1K active workspaces | $1.5K-$3K | App compute, PostgreSQL, Redis, object storage, observability |
| 10K active workspaces | $8K-$18K | Read replicas, workers, CDN, search, AI usage |
| 100K active workspaces | $60K-$140K | Service extraction, event streaming, analytics warehouse, media processing |
| 1M active workspaces | $400K+ | Multi-region, sharding, enterprise isolation, AI and analytics volume |

## Cost Controls

- Meter AI tokens by workspace and enforce plan limits.
- Cache dashboard and analytics summaries.
- Store media variants only when used.
- Use lifecycle policies for cold analytics and audit archives.
- Run publishing workers with autoscaling by queue depth.
- Attribute infrastructure costs to tenants through workspace tags.
