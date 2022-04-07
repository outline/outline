import { APM } from "@server/logging/tracing";
import Document from "@server/models/Document";
import { Event } from "@server/types";
import { globalEventQueue } from "..";
import BaseProcessor from "./BaseProcessor";

@APM.trace()
export default class DebounceProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.update",
    "documents.update.delayed",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.update": {
        globalEventQueue.add(
          { ...event, name: "documents.update.delayed" },
          {
            delay: 5 * 60 * 1000,
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

        globalEventQueue.add({ ...event, name: "documents.update.debounced" });
        break;
      }

      default:
    }
  }
}
