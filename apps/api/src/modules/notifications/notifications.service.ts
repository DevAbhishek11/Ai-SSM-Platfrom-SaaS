import { Injectable, NotFoundException } from "@nestjs/common";
import { demoNotifications, type Notification } from "@ssm/domain";

@Injectable()
export class NotificationsService {
  private readonly notifications: Notification[] = [...demoNotifications];

  list(userId: string) {
    return this.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  markRead(id: string) {
    const notification = this.notifications.find((item) => item.id === id);
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    notification.read = true;
    return notification;
  }
}
