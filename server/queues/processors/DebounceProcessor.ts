import env from "@server/env";
import Document from "@server/models/Document";
import { Event } from "@server/types";
import { globalEventQueue } from "..";
import BaseProcessor from "./BaseProcessor";

export default class DebounceProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.update",
    "documents.update.delayed",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.update": {
        await globalEventQueue.add(
          { ...event, name: "documents.update.delayed" },
          {
            // speed up revision creation in development, we don't have all the
            // time in the world.
            delay: (env.isProduction ? 5 : 0.5) * 60 * 1000,
          }
        );
        break;
      }

      case "documents.update.delayed": {
        const document = await Document.findByPk(event.documentId, {
          attributes: ["updatedAt"],
        });

        // If the document has been deleted then prevent further processing
        if (!document) {
          return;
        }

        // If the document has been updated since we initially queued the delayed
        // event then abort, there must be another updated event in the queue –
        // this functions as a simple distributed debounce.
        if (document.updatedAt > new Date(event.createdAt)) {
          return;
        }

        await globalEventQueue.add({
          ...event,
          name: "documents.update.debounced",
        });
        break;
      }

      default:
    }
  }
}
