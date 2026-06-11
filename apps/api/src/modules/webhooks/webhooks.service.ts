import { Injectable, NotFoundException } from "@nestjs/common";
import { demoWebhookDeliveries, type WebhookDelivery } from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";

@Injectable()
export class WebhooksService {
  private readonly deliveries: WebhookDelivery[] = [...demoWebhookDeliveries];

  constructor(private readonly auditService: AuditService) {}

  listDeliveries(workspaceId: string) {
    return this.deliveries
      .filter((delivery) => delivery.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  replay(id: string, user?: Principal) {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (!delivery) {
      throw new NotFoundException("Webhook delivery not found");
    }

    const previousStatus = delivery.status;
    delivery.status = "pending";
    delivery.attempts += 1;
    delivery.nextRetryAt = new Date(Date.now() + 60_000).toISOString();
    this.auditService.record({
      workspaceId: delivery.workspaceId,
      userId: user?.userId,
      action: "webhooks.delivery_replayed",
      entityType: "webhook_delivery",
      entityId: delivery.id,
      oldValues: { status: previousStatus },
      newValues: {
        status: delivery.status,
        attempts: delivery.attempts,
        nextRetryAt: delivery.nextRetryAt
      }
    });
    return delivery;
  }
}
