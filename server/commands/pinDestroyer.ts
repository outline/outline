import { Transaction } from "sequelize";
import { Event } from "@server/models";
import { sequelize } from "@server/sequelize";

type Props = {
  /** The user destroying the pin */
  user: any;
  /** The pin to destroy */
  pin: any;
  /** The IP address of the user creating the pin */
  ip: string;
  /** Optional existing transaction */
  transaction?: Transaction;
};

/**
 * This command destroys a document pin. This just removes the pin itself and
 * does not touch the document
 *
 * @param Props The properties of the pin to destroy
 * @returns void
 */
export default async function pinDestroyer({
  user,
  pin,
  ip,
  transaction: t,
}: Props): Promise<any> {
  const transaction = t || (await sequelize.transaction());

  try {
    await Event.create(
      {
        name: "pins.delete",
        modelId: pin.id,
        teamId: user.teamId,
        actorId: user.id,
        documentId: pin.documentId,
        collectionId: pin.collectionId,
        ip,
      },
      { transaction }
    );

    await pin.destroy({ transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return pin;
}
