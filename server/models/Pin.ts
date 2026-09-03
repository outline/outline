import type {
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import { Op } from "sequelize";
import {
  DataType,
  Column,
  ForeignKey,
  BelongsTo,
  BeforeCreate,
  Table,
  Length,
} from "sequelize-typescript";
import { PinValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import { LockHelper } from "@server/storage/LockHelper";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";

@Table({ tableName: "pins", modelName: "pin" })
class Pin extends IdModel<
  InferAttributes<Pin>,
  Partial<InferCreationAttributes<Pin>>
> {
  @Length({
    max: 256,
    msg: `index must be 256 characters or less`,
  })
  @Column(DataType.STRING)
  index: string | null;

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  // hooks

  /**
   * Limits the number of documents pinned to a single destination, either one
   * collection or the home screen.
   */
  @BeforeCreate
  static async checkLimit(model: Pin, options: SaveOptions) {
    const { transaction } = options;
    const { teamId, collectionId } = model;

    // Serialize concurrent creation for the destination, otherwise every
    // request can read the same count and pass the check.
    await LockHelper.acquire(
      model.sequelize,
      `pins:${teamId}:${collectionId ?? "home"}`,
      transaction
    );

    const count = await this.count({
      where: {
        teamId,
        ...(collectionId
          ? { collectionId }
          : { collectionId: { [Op.is]: null } }),
      },
      transaction,
    });
    if (count >= PinValidation.max) {
      throw ValidationError(
        `You cannot pin more than ${PinValidation.max} documents`
      );
    }
  }
}

export default Pin;
