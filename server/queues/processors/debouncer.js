// @flow
import { Document } from "../../models";
import { globalEventQueue } from "../../queues";
import type { Event } from "../../types";

export default class DebounceProcessor {
  async on(event: Event) {
    switch (event.name) {
      case "documents.update": {
        globalEventQueue.add(
          {
            ...event,
            name: "documents.update.delayed",
          },
          {
            delay: 5 * 60 * 1000,
          }
        );
        break;
      }
      case "documents.update.delayed": {
        const document = await Document.findByPk(event.documentId, {
          fields: ["updatedAt"],
        });

        // If the document has been deleted then prevent further processing
        if (!document) return;

        // If the document has been updated since we initially queued the delayed
        // event then abort, there must be another updated event in the queue –
        // this functions as a simple distributed debounce.
        if (document.updatedAt > new Date(event.createdAt)) return;

        globalEventQueue.add({
          ...event,
          name: "documents.update.debounced",
        });
        break;
      }
      default:
    }
  }
}
