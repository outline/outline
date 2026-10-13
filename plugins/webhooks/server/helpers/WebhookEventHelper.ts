import { Op } from "sequelize";
import {
  Attachment,
  Collection,
  Document,
  FileOperation,
} from "@server/models";
import type { Event } from "@server/types";

export class WebhookEventHelper {
  /**
   * Whether an event relates to a personal collection, or to a document,
   * attachment or file operation in one. Such events are never sent to workspace webhooks,
   * as any admin can change where a webhook delivers to.
   *
   * @param event The event to check.
   * @returns true if the event is in a personal collection.
   */
  public static async isInPersonalCollection(event: Event): Promise<boolean> {
    const modelId = "modelId" in event ? event.modelId : null;
    const collectionIds: string[] = [];
    let documentId = "documentId" in event ? event.documentId : null;

    if ("collectionId" in event && event.collectionId) {
      collectionIds.push(event.collectionId);
    }
    if (event.name.startsWith("collections.") && modelId) {
      collectionIds.push(modelId);
    }

    if (event.name.startsWith("fileOperations.") && modelId) {
      const fileOperation = await FileOperation.unscoped().findOne({
        attributes: ["collectionId", "documentId"],
        where: { id: modelId },
        paranoid: false,
      });
      if (fileOperation?.collectionId) {
        collectionIds.push(fileOperation.collectionId);
      }
      documentId = documentId ?? fileOperation?.documentId ?? null;
    }

    if (event.name.startsWith("attachments.") && modelId) {
      const attachment = await Attachment.unscoped().findOne({
        attributes: ["documentId"],
        where: { id: modelId },
        paranoid: false,
      });
      documentId = documentId ?? attachment?.documentId ?? null;
    }

    // The document may have moved since the event, so its current collection
    // is checked as well.
    if (documentId) {
      const document = await Document.unscoped().findOne({
        attributes: ["collectionId"],
        where: { id: documentId },
        paranoid: false,
      });
      if (document?.collectionId) {
        collectionIds.push(document.collectionId);
      }
    }

    if (!collectionIds.length) {
      return false;
    }

    const count = await Collection.unscoped().count({
      where: {
        id: collectionIds,
        ownerId: { [Op.ne]: null },
      },
      paranoid: false,
    });
    return count > 0;
  }
}
