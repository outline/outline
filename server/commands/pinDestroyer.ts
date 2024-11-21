import { Transaction } from "sequelize";
import { Event, Pin, User } from "@server/models";

type Props = {
  /** The user destroying the pin */
  user: User;
  /** The pin to destroy */
  pin: Pin;
  /** The IP address of the user creating the pin */
  ip: string;
  /** Optional existing transaction */
  transaction?: Transaction;
};

/**
 * @deprecated use pin.destroyWithCtx instead. This will be removed once document routes migrate to auto event insertion using APIContext.
 *
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
  transaction,
}: Props): Promise<Pin> {
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

  return pin;
}
