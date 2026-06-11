import { Injectable, NotFoundException } from "@nestjs/common";
import { demoWebhookDeliveries, type WebhookDelivery } from "@ssm/domain";

@Injectable()
export class WebhooksService {
  private readonly deliveries: WebhookDelivery[] = [...demoWebhookDeliveries];

  listDeliveries(workspaceId: string) {
    return this.deliveries
      .filter((delivery) => delivery.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  replay(id: string) {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (!delivery) {
      throw new NotFoundException("Webhook delivery not found");
    }

    delivery.status = "pending";
    delivery.attempts += 1;
    delivery.nextRetryAt = new Date(Date.now() + 60_000).toISOString();
    return delivery;
  }
}
