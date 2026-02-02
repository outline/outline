import { Document, DocumentChangeLog, User } from "@server/models";
import type { DocumentEvent } from "@server/types";
import OwnerNotificationTask from "../tasks/OwnerNotificationTask";
import BaseProcessor from "./BaseProcessor";

/**
 * Processor for logging document changes made by users other than the owner.
 * Creates change logs and triggers notifications to the document owner.
 */
export default class DocumentChangeLogProcessor extends BaseProcessor {
  static applicableEvents: DocumentEvent["name"][] = [
    "documents.update",
    "documents.delete",
    "documents.archive",
    "documents.restore",
    "documents.unpublish",
    "documents.title_change",
  ];

  async perform(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId, {
      paranoid: false,
      include: [
        {
          model: User,
          as: "createdBy",
          required: false,
        },
      ],
    });

    if (!document) {
      return;
    }

    // Get the owner (creator) of the document
    const ownerId = document.createdById;
    const changedById = event.actorId;

    // Only log changes if the change was made by someone other than the owner
    if (!ownerId || !changedById || ownerId === changedById) {
      return;
    }

    // Determine change type and description
    let changeType: string;
    let description: string | null = null;
    const metadata: Record<string, unknown> = {};

    switch (event.name) {
      case "documents.update":
        changeType = "update";
        description = "Документ был изменен";
        if (event.changes) {
          metadata.changes = event.changes;
        }
        break;
      case "documents.delete":
        changeType = "delete";
        description = "Документ был удален";
        break;
      case "documents.archive":
        changeType = "archive";
        description = "Документ был архивирован";
        break;
      case "documents.restore":
        changeType = "restore";
        description = "Документ был восстановлен";
        break;
      case "documents.unpublish":
        changeType = "unpublish";
        description = "Документ был снят с публикации";
        break;
      case "documents.title_change":
        changeType = "title_change";
        description = "Заголовок документа был изменен";
        if (event.changes?.previous?.title && event.changes?.current?.title) {
          metadata.previousTitle = event.changes.previous.title;
          metadata.newTitle = event.changes.current.title;
        }
        break;
      default:
        return;
    }

    // Create change log entry
    await DocumentChangeLog.create({
      documentId: document.id,
      ownerId,
      changedById,
      changeType,
      description,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });

    // Trigger notification task for the owner
    await new OwnerNotificationTask().schedule({
      documentId: document.id,
      ownerId,
      changedById,
      changeType,
      eventName: event.name,
    });
  }
}
