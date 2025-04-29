import isEqual from "fast-deep-equal";
import revisionCreator from "@server/commands/revisionCreator";
import { Revision, Document, User } from "@server/models";
import { DocumentEvent, RevisionEvent, Event } from "@server/types";
import DocumentUpdateTextTask from "../tasks/DocumentUpdateTextTask";
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
          rejectOnEmpty: true,
        });
        const previous = await Revision.findLatest(document.id);

        // we don't create revisions if identical to previous revision, this can happen if a manual
        // revision was created from another service or user.
        if (
          previous &&
          isEqual(document.content, previous.content) &&
          document.title === previous.title
        ) {
          return;
        }

        await new DocumentUpdateTextTask().schedule(event);

        const user = await User.findByPk(event.actorId, {
          paranoid: false,
          rejectOnEmpty: true,
        });
        await revisionCreator({
          event,
          user,
          document,
        });
        break;
      }

      default:
    }
  }
}
