import { Star } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { DocumentEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class DocumentArchivedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["documents.archive"];

  async perform(event: DocumentEvent) {
    await sequelize.transaction(async (transaction) => {
      // Remove the document from the actor's starred documents
      await Star.destroy({
        where: {
          documentId: event.documentId,
          userId: event.actorId,
        },
        transaction,
      });
    });
  }
}
