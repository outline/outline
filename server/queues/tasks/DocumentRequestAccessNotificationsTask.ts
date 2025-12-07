import { Op } from "sequelize";
import {
  NotificationEventType,
  DocumentPermission,
  CollectionPermission,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Document, Notification, User, Collection } from "@server/models";
import { DocumentAccessRequestEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";
import { uniq } from "lodash";

/**
 * Notification task that sends notifications to users who can manage a document
 * when someone requests access to it.
 */
export default class DocumentRequestAccessNotificationsTask extends BaseTask<DocumentAccessRequestEvent> {
  public async perform(event: DocumentAccessRequestEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document) {
      Logger.debug(
        "task",
        `Document not found for access request notification`,
        {
          documentId: event.documentId,
        }
      );
      return;
    }

    const requestingUser = await User.findByPk(event.userId);
    if (!requestingUser) {
      Logger.debug(
        "task",
        `Requesting user not found for access request notification`,
        {
          userId: event.userId,
        }
      );
      return;
    }

    const recipients = await this.findDocumentManagers(document);
    for (const recipient of recipients) {
      if (
        recipient.id === requestingUser.id ||
        recipient.isSuspended ||
        !recipient.subscribedToEventType(
          NotificationEventType.RequestDocumentAccess
        )
      ) {
        continue;
      }

      await Notification.create({
        event: NotificationEventType.RequestDocumentAccess,
        userId: recipient.id,
        actorId: event.userId,
        teamId: event.teamId,
        documentId: event.documentId,
      });
    }
  }

  /**
   * Find all users who can manage the document (have admin/manage permissions).
   *
   * @param document - the document to find managers for.
   * @returns list of users who can manage the document.
   */
  private async findDocumentManagers(document: Document): Promise<User[]> {
    const documentMemberships = await Document.membershipUserIds(
      document.id,
      DocumentPermission.Admin
    );

    let collectionMemberships: string[] = [];
    if (document.collectionId) {
      collectionMemberships = await Collection.membershipUserIds(
        document.collectionId,
        CollectionPermission.Admin
      );
    }

    const managerIds = uniq([...documentMemberships, ...collectionMemberships]);

    // Fetch the actual user objects
    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: Array.from(managerIds),
        },
        teamId: document.teamId,
      },
    });

    return users;
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
