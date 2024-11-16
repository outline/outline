import { Transaction, Op } from "sequelize";
import { Collection, Document, Event, User } from "@server/models";

type Props = {
  /** The collection to delete */
  collection: Collection;
  /** The actor who is deleting the collection */
  user: User;
  /** The database transaction to use */
  transaction: Transaction;
  /** The IP address of the current request */
  ip: string | null;
};

export default async function collectionDestroyer({
  collection,
  transaction,
  user,
  ip,
}: Props) {
  await collection.destroy({ transaction });

  await Document.update(
    {
      lastModifiedById: user.id,
      deletedAt: new Date(),
    },
    {
      transaction,
      where: {
        teamId: collection.teamId,
        collectionId: collection.id,
        archivedAt: {
          [Op.is]: null,
        },
      },
    }
  );

  await Event.create(
    {
      name: "collections.delete",
      collectionId: collection.id,
      teamId: collection.teamId,
      actorId: user.id,
      data: {
        name: collection.name,
      },
      ip,
    },
    { transaction }
  );
}
