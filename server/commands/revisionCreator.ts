import { Document, User, Event, Revision } from "../models";
import { sequelize } from "../sequelize";

export default async function revisionCreator({
  document,
  user,
  ip,
}: {
  document: Document;
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
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
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
        documentId: document.id,
        modelId: revision.id,
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'teamId' does not exist on type 'Document... Remove this comment to see the full error message
        teamId: document.teamId,
        actorId: user.id,
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'updatedAt' does not exist on type 'Docum... Remove this comment to see the full error message
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
