// @flow
import { Document } from "../../models";
import { globalEventsQueue } from "../../queues";
import type { Event } from "../../types";

export default class Debouncer {
  async on(event: Event) {
    switch (event.name) {
      case "documents.update": {
        globalEventsQueue.add(
          {
            ...event,
            name: "documents.update.delayed",
          },
          {
            delay: 5 * 60 * 1000,
            removeOnComplete: true,
          }
        );
        break;
      }
      case "documents.update.delayed": {
        const document = await Document.findByPk(event.documentId);

        // If the document has been deleted then prevent further processing
        if (!document) return;

        // If the document has been updated since we initially queued the delayed
        // event then abort, there must be another updated event in the queue –
        // this functions as a simple distributed debounce.
        if (document.updatedAt > new Date(event.createdAt)) return;

        globalEventsQueue.add(
          {
            ...event,
            name: "documents.update.debounced",
          },
          { removeOnComplete: true }
        );
        break;
      }
      default:
    }
  }
}
