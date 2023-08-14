import invariant from "invariant";
import revisionCreator from "@server/commands/revisionCreator";
import { Revision, Document, User } from "@server/models";
import { DocumentEvent, RevisionEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class RevisionsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.update",
    "documents.update.debounced",
  ];

  async perform(event: DocumentEvent | RevisionEvent) {
    switch (event.name) {
      case "documents.publish":
      case "documents.update.debounced":
      case "documents.update": {
        if (event.name === "documents.update" && !event.data.done) {
          return;
        }

        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });
        invariant(document, "Document should exist");
        const previous = await Revision.findLatest(document.id);

        // we don't create revisions if identical to previous revision, this can
        // happen if a manual revision was created from another service or user.
        if (
          previous &&
          document.text === previous.text &&
          document.title === previous.title
        ) {
          return;
        }

        const user = await User.findByPk(event.actorId, {
          paranoid: false,
          rejectOnEmpty: true,
        });
        await revisionCreator({
          user,
          document,
        });
        break;
      }

      default:
    }
  }
}
