import { Op } from "sequelize";
import { Document, GroupUser, Notification } from "@server/models";
import type {
  CollectionEvent,
  CollectionGroupEvent,
  CollectionUserEvent,
  DocumentEvent,
  DocumentGroupEvent,
  DocumentMovedEvent,
  DocumentUserEvent,
  Event,
  GroupEvent,
  UserEvent,
} from "@server/types";
import type { RevokeScope } from "../tasks/RevokeUserNotificationsTask";
import RevokeUserNotificationsTask from "../tasks/RevokeUserNotificationsTask";
import BaseProcessor from "./BaseProcessor";

type ReceivedEvent =
  | CollectionEvent
  | CollectionUserEvent
  | CollectionGroupEvent
  | DocumentUserEvent
  | DocumentGroupEvent
  | DocumentMovedEvent
  | DocumentEvent
  | GroupEvent
  | UserEvent;

/**
 * Revokes notifications that reference a document or collection once the recipient loses access to it.
 */
export default class NotificationsRevokeProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "collections.remove_user",
    "collections.remove_group",
    "collections.permission_changed",
    "documents.remove_user",
    "documents.remove_group",
    "documents.move",
    "documents.restore",
    "documents.unarchive",
    "groups.remove_user",
    "groups.delete",
    "users.demote",
  ];

  async perform(event: ReceivedEvent) {
    switch (event.name) {
      case "collections.remove_user":
        await new RevokeUserNotificationsTask().schedule({
          userId: event.userId,
          collectionId: event.collectionId,
        });
        return;

      case "documents.remove_user":
        await new RevokeUserNotificationsTask().schedule({
          userId: event.userId,
          documentId: event.documentId,
        });
        return;

      case "collections.remove_group":
        return this.handleRemoveGroup(event.modelId, {
          collectionId: event.collectionId,
        });

      case "documents.remove_group":
        return this.handleRemoveGroup(event.modelId, {
          documentId: event.documentId,
        });

      // Access lost through a group or a role change cannot be scoped to a single collection or
      // document, so all of the user's notifications are re-checked.
      case "groups.remove_user":
      case "users.demote":
        await new RevokeUserNotificationsTask().schedule({
          userId: event.userId,
        });
        return;

      case "groups.delete":
        return this.handleRemoveGroup(event.modelId, {});

      case "collections.permission_changed":
        return this.handlePermissionChanged(event);

      case "documents.move":
        return this.handleDocumentMoved(
          event.documentId,
          event.data.documentIds
        );

      case "documents.restore":
      case "documents.unarchive":
        return this.handleDocumentRestored(event.documentId);
    }
  }

  // A move carries the document into a different collection or parent, which the recipient of a
  // notification about it may not be able to read.
  private async handleDocumentMoved(documentId: string, documentIds: string[]) {
    const notifications = await Notification.unscoped().findAll({
      attributes: ["userId"],
      where: { documentId: documentIds },
      group: ["notification.userId"],
    });

    await Promise.all(
      notifications.map((notification) =>
        new RevokeUserNotificationsTask().schedule({
          userId: notification.userId,
          documentId,
        })
      )
    );
  }

  // A restore can place the document in a different collection or parent, in the same way as a move.
  private async handleDocumentRestored(documentId: string) {
    const document = await Document.findByPk(documentId);
    if (!document) {
      return;
    }

    const childDocumentIds = await document.findAllChildDocumentIds();
    return this.handleDocumentMoved(document.id, [
      document.id,
      ...childDocumentIds,
    ]);
  }

  private async handleRemoveGroup(groupId: string, scope: RevokeScope) {
    await GroupUser.findAllInBatches<GroupUser>(
      {
        attributes: ["userId"],
        where: { groupId },
        batchLimit: 1000,
      },
      async (groupUsers) => {
        await Promise.all(
          groupUsers.map((groupUser) =>
            new RevokeUserNotificationsTask().schedule({
              ...scope,
              userId: groupUser.userId,
            })
          )
        );
      }
    );
  }

  private async handlePermissionChanged(event: CollectionEvent) {
    const notifications = await Notification.unscoped().findAll({
      attributes: ["userId"],
      where: {
        [Op.or]: [
          { collectionId: event.collectionId },
          { "$document.collectionId$": event.collectionId },
        ],
      },
      include: [
        {
          model: Document.unscoped(),
          as: "document",
          attributes: [],
          required: false,
          paranoid: false,
        },
      ],
      group: ["notification.userId"],
    });

    await Promise.all(
      notifications.map((notification) =>
        new RevokeUserNotificationsTask().schedule({
          userId: notification.userId,
          collectionId: event.collectionId,
        })
      )
    );
  }
}
