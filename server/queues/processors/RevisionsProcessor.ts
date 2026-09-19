import isEqual from "fast-deep-equal";
import Redis from "@server/storage/redis";
import revisionCreator from "@server/commands/revisionCreator";
import { Revision, Document, User } from "@server/models";
import type { DocumentEvent, RevisionEvent, Event } from "@server/types";
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
        if (event.name === "documents.update" && !event.data?.done) {
          return;
        }

        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
          rejectOnEmpty: true,
        });
        const previous = await Revision.findLatest(document.id);

        // Only read attribution included in a persisted snapshot. Revisions
        // created from the API and legacy events have no cutoff and must not
        // consume pending edits.
        const sequence =
          event.data && "collaborators" in event.data
            ? event.data.collaborators
            : undefined;
        const key = Document.getCollaboratorKey(event.documentId);

        // we don't create revisions if identical to previous revision, this can happen if a manual
        // revision was created from another service or user.
        if (
          previous &&
          isEqual(document.content, previous.content) &&
          document.title === previous.title
        ) {
          // The snapshot's edits are already in a revision, so consume their
          // attribution rather than carry it into the next revision.
          if (sequence !== undefined) {
            await Redis.defaultClient.zremrangebyscore(key, "-inf", sequence);
          }
          return;
        }

        const collaboratorIds =
          sequence === undefined
            ? []
            : await Redis.defaultClient.zrangebyscore(key, "-inf", sequence);

        await new DocumentUpdateTextTask().schedule(event);

        const user = await User.findByPk(event.actorId, {
          paranoid: false,
          rejectOnEmpty: true,
        });

        await revisionCreator({
          event,
          user,
          collaboratorIds,
          document,
        });
        if (sequence !== undefined) {
          // A subsequent edit by the same user has a higher score and survives
          // this cleanup. Leave all attribution intact if revision creation fails.
          await Redis.defaultClient.zremrangebyscore(key, "-inf", sequence);
        }
        break;
      }

      default:
    }
  }
}
