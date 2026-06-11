# Scalability Roadmap

## 1K Active Workspaces

- Modular monolith API.
- PostgreSQL primary with PgBouncer.
- Redis cache and BullMQ publishing workers.
- Object storage for media.
- Basic Prometheus/Grafana observability.

## 10K Active Workspaces

- Read replicas for analytics and dashboard reads.
- Materialized dashboard summaries.
- Dedicated publishing worker pools per major platform.
- Search service for media and content.
- Background AI generation queue.

## 100K Active Workspaces

- Extract social connector, analytics, media, and AI services.
- Partition analytics snapshots and audit logs.
- Regional object storage and CDN.
- Kafka or managed event streaming for high-volume events.
- Tenant-level rate limits and noisy-neighbor controls.

## 1M Active Workspaces

- Multi-region deployment with data residency routing.
- Tenant sharding for PostgreSQL.
- Dedicated enterprise clusters for regulated tenants.
- Global API gateway with regional failover.
- Warehouse-backed reporting and offline feature store for AI recommendations.
