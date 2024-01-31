import { NotificationEventType } from "@shared/types";
import { Notification, User } from "@server/models";
import { DocumentUserEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserMembershipCreatedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["documents.add_user"];

  async perform(event: DocumentUserEvent) {
    if (!event.data.isNew) {
      return;
    }

    const user = await User.findByPk(event.userId);
    if (!user) {
      return;
    }

    if (
      event.userId !== event.actorId &&
      user.subscribedToEventType(NotificationEventType.AddUserToDocument)
    ) {
      await Notification.create({
        event: NotificationEventType.AddUserToDocument,
        userId: event.userId,
        actorId: event.actorId,
        teamId: event.teamId,
        documentId: event.documentId,
      });
    }
  }
}
