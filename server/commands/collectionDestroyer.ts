import { Transaction } from "sequelize";
import { Collection, Event, User } from "@server/models";

type Props = {
  /** The collection to delete */
  collection: Collection;
  /** The actor who is deleting the collection */
  user: User;
  /** The database transaction to use */
  transaction: Transaction;
  /** The IP address of the current request */
  ip: string;
};

export default async function collectionDestroyer({
  collection,
  transaction,
  user,
  ip,
}: Props) {
  await collection.destroy({ transaction });

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
