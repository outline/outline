import documentStateFlattener from "@server/commands/documentStateFlattener";
import type { DocumentEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class DocumentStateProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["documents.update.debounced"];

  /**
   * Flatten the collaborative state of a document once nobody has edited it
   * for some time, so that users are unlikely to see the reset.
   *
   * @param event the debounced update event.
   * @returns a promise resolving when the event is processed.
   */
  async perform(event: DocumentEvent) {
    if (event.name !== "documents.update.debounced") {
      return;
    }

    await documentStateFlattener({
      documentId: event.documentId,
      actorId: event.actorId,
      since: new Date(event.createdAt),
    });
  }
}
