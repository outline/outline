import { Document, User, Event, Revision } from "@server/models";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";
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
    // Get collaborator IDs since last revision was written.
    const key = Document.getCollaboratorKey(document.id);
    const collaboratorIds = await Redis.defaultClient.smembers(key);
    await Redis.defaultClient.del(key);

    const revision = await Revision.createFromDocument(
      document,
      collaboratorIds,
      {
        transaction,
      }
    );

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
