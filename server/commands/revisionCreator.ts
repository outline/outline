import { Document, User, Event, Revision } from "@server/models";
import { sequelize } from "@server/storage/database";
import { DocumentEvent, RevisionEvent } from "@server/types";

export default async function revisionCreator({
  event,
  document,
  user,
}: {
  event: DocumentEvent | RevisionEvent;
  document: Document;
  user: User;
}) {
  return sequelize.transaction(async (transaction) => {
    const revision = await Revision.createFromDocument(document, {
      transaction,
    });
    await Event.create(
      {
        name: "revisions.create",
        documentId: document.id,
        collectionId: document.collectionId,
        modelId: revision.id,
        teamId: document.teamId,
        actorId: user.id,
        createdAt: document.updatedAt,
        ip: event.ip ?? user.lastActiveIp,
        authType: event.authType,
      },
      {
        transaction,
      }
    );
    return revision;
  });
}
