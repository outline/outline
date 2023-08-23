import { Document, User, Event, Revision } from "@server/models";
import { sequelize } from "@server/storage/database";

export default async function revisionCreator({
  document,
  user,
  ip,
}: {
  document: Document;
  user: User;
  ip?: string;
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
        ip: ip || user.lastActiveIp,
      },
      {
        transaction,
      }
    );
    return revision;
  });
}
