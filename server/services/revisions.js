// @flow
import type { DocumentEvent, RevisionEvent } from "../events";
import { Revision, Document, Event } from "../models";

export default class Revisions {
  async on(event: DocumentEvent | RevisionEvent) {
    switch (event.name) {
      case "documents.publish":
      case "documents.update.debounced": {
        const document = await Document.findByPk(event.documentId);
        if (!document) return;

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

        const revision = await Revision.createFromDocument(document);
        Event.add({
          name: "revisions.create",
          documentId: document.id,
          collectionId: document.collectionId,
          modelId: revision.id,
          teamId: document.teamId,
          actorId: revision.userId,
        });

        break;
      }
      default:
    }
  }
}
