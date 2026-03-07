import { createContext } from "@server/context";
import { Star, User } from "@server/models";
import type { DocumentEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class DocumentArchivedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["documents.archive"];

  /**
   * Performs the processor action when a document is archived.
   * Removes the document from the actor's starred documents.
   *
   * @param event The document archive event.
   * @returns A promise that resolves when the operation is complete.
   * @throws {Error} If the database operation fails.
   */
  async perform(event: DocumentEvent) {
    const star = await Star.findOne({
      where: {
        documentId: event.documentId,
        userId: event.actorId,
      },
    });

    if (star) {
      const user = await User.findByPk(event.actorId, { rejectOnEmpty: true });
      await star.destroyWithCtx(createContext({ user, ip: event.ip }));
    }
  }
}
