import { createContext } from "@server/context";
import type { User } from "@server/models";
import { Document, Revision } from "@server/models";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";
import type { DocumentEvent, RevisionEvent } from "@server/types";

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

    return await Revision.createFromDocument(
      createContext({
        user,
        authType: event.authType,
        ip: event.ip,
        transaction,
      }),
      document,
      collaboratorIds
    );
  });
}
