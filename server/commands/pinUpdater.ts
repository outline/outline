import { Event, Pin, User } from "@server/models";
import { sequelize } from "@server/storage/database";

type Props = {
  /** The user updating the pin */
  user: User;
  /** The existing pin */
  pin: Pin;
  /** The index to pin the document at */
  index: string;
  /** The IP address of the user creating the pin */
  ip: string;
};

/**
 * This command updates a "pinned" document. A pin can only be moved to a new
 * index (reordered) once created.
 *
 * @param Props The properties of the pin to update
 * @returns Pin The updated pin
 */
export default async function pinUpdater({
  user,
  pin,
  index,
  ip,
}: Props): Promise<Pin> {
  const transaction = await sequelize.transaction();

  try {
    pin.index = index;
    await pin.save({ transaction });

    await Event.create(
      {
        name: "pins.update",
        modelId: pin.id,
        teamId: user.teamId,
        actorId: user.id,
        documentId: pin.documentId,
        collectionId: pin.collectionId,
        ip,
      },
      { transaction }
    );
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return pin;
}
