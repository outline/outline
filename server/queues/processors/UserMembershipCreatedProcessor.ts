import { NotificationEventType } from "@shared/types";
import { Notification, User } from "@server/models";
import { CollectionUserEvent, DocumentUserEvent, Event } from "@server/types";
import { TaskPriority } from "../tasks/BaseTask";
import BaseProcessor from "./BaseProcessor";

export default class UserMembershipCreatedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.add_user",
    "collections.add_user",
  ];

  async perform(event: DocumentUserEvent | CollectionUserEvent) {
    if (!event.data.isNew || event.userId === event.actorId) {
      return;
    }

    const recipient = await User.findByPk(event.userId);
    if (!recipient || !recipient.email || recipient.isSuspended) {
      return;
    }

    switch (event.name) {
      case "documents.add_user": {
        if (
          recipient.subscribedToEventType(
            NotificationEventType.AddUserToDocument
          )
        ) {
          await Notification.create({
            event: NotificationEventType.AddUserToDocument,
            userId: event.userId,
            actorId: event.actorId,
            teamId: event.teamId,
            documentId: event.documentId,
          });
        }
        return;
      }
      case "collections.add_user": {
        if (
          recipient.subscribedToEventType(
            NotificationEventType.AddUserToCollection
          )
        ) {
          await Notification.create({
            event: NotificationEventType.AddUserToCollection,
            userId: event.userId,
            actorId: event.actorId,
            teamId: event.teamId,
            collectionId: event.collectionId,
          });
        }
        return;
      }
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
