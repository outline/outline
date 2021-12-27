import { sequelize } from "@server/database/sequelize";
import { Document, User, Event, Revision } from "@server/models";

export default async function revisionCreator({
  document,
  user,
  ip,
}: {
  document: Document;
  user: User;
  ip?: string;
}) {
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const revision = await Revision.createFromDocument(document, {
      transaction,
    });
    await Event.create(
      {
        name: "revisions.create",
        documentId: document.id,
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
    await transaction.commit();
    return revision;
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }

    throw err;
  }
}
