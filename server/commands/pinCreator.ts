import fractionalIndex from "fractional-index";
import { Sequelize, Op, WhereOptions } from "sequelize";
import { PinValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import { Pin, User, Event } from "@server/models";
import { sequelize } from "@server/storage/database";

type Props = {
  /** The user creating the pin */
  user: User;
  /** The document to pin */
  documentId: string;
  /** The collection to pin the document in. If no collection is provided then it will be pinned to home */
  collectionId?: string | null;
  /** The index to pin the document at. If no index is provided then it will be pinned to the end of the collection */
  index?: string;
  /** The IP address of the user creating the pin */
  ip: string;
};

/**
 * This command creates a "pinned" document via the pin relation. A document can
 * be pinned to a collection or to the home screen.
 *
 * @param Props The properties of the pin to create
 * @returns Pin The pin that was created
 */
export default async function pinCreator({
  user,
  documentId,
  collectionId,
  ip,
  ...rest
}: Props): Promise<Pin> {
  let { index } = rest;
  const where: WhereOptions<Pin> = {
    teamId: user.teamId,
    ...(collectionId ? { collectionId } : { collectionId: { [Op.is]: null } }),
  };

  const count = await Pin.count({ where });
  if (count >= PinValidation.max) {
    throw ValidationError(
      `You cannot pin more than ${PinValidation.max} documents`
    );
  }

  if (!index) {
    const pins = await Pin.findAll({
      where,
      attributes: ["id", "index", "updatedAt"],
      limit: 1,
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        // find only the last pin so we can create an index after it
        Sequelize.literal('"pin"."index" collate "C" DESC'),
        ["updatedAt", "ASC"],
      ],
    });

    // create a pin at the end of the list
    index = fractionalIndex(pins.length ? pins[0].index : null, null);
  }

  const transaction = await sequelize.transaction();
  let pin;

  try {
    pin = await Pin.create(
      {
        createdById: user.id,
        teamId: user.teamId,
        collectionId,
        documentId,
        index,
      },
      { transaction }
    );

    await Event.create(
      {
        name: "pins.create",
        modelId: pin.id,
        teamId: user.teamId,
        actorId: user.id,
        documentId,
        collectionId,
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
