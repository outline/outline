import { createContext } from "@server/context";
import { Document, User, Revision } from "@server/models";
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
    const ctx = createContext({
      user,
      authType: event.authType,
      ip: event.ip ?? user.lastActiveIp,
      transaction,
    });

    return Revision.createFromDocumentWithCtx(ctx, document);
  });
}
