import type {
  InferAttributes,
  InferCreationAttributes,
  InstanceDestroyOptions,
} from "sequelize";
import { Op, type SaveOptions } from "sequelize";
import {
  AfterDestroy,
  BeforeCreate,
  BeforeSave,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Is,
  Table,
} from "sequelize-typescript";
import { EmojiValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Length from "./validators/Length";
import Attachment from "./Attachment";

@Table({ tableName: "emojis", modelName: "emoji" })
class Emoji extends IdModel<
  InferAttributes<Emoji>,
  Partial<InferCreationAttributes<Emoji>>
> {
  @Length({
    max: EmojiValidation.maxNameLength,
    msg: `emoji name must be less than ${EmojiValidation.maxNameLength} characters`,
  })
  @Is({
    args: EmojiValidation.allowedNameCharacters,
    msg: "emoji name can only contain lowercase letters, numbers, and underscores",
  })
  @Column(DataType.STRING)
  name: string;

  // associations
  @BelongsTo(() => Attachment, "attachmentId")
  attachment: Attachment;

  @ForeignKey(() => Attachment)
  @Column(DataType.UUID)
  attachmentId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  // hooks
  @BeforeCreate
  static async checkUniqueName(
    model: Emoji,
    options: SaveOptions<Emoji>
  ): Promise<void> {
    const existingEmoji = await this.findOne({
      where: {
        name: model.name,
        teamId: model.teamId,
      },
      transaction: options.transaction,
    });

    if (existingEmoji) {
      throw ValidationError(`Emoji with name "${model.name}" already exists.`);
    }
  }

  @BeforeSave
  static async checkUniqueAttachment(
    model: Emoji,
    options: SaveOptions<Emoji>
  ): Promise<void> {
    if (!model.changed("attachmentId")) {
      return;
    }

    const existingEmoji = await this.findOne({
      where: {
        attachmentId: model.attachmentId,
        id: { [Op.ne]: model.id },
      },
      transaction: options.transaction,
    });

    if (existingEmoji) {
      throw ValidationError("Attachment is already used by another emoji");
    }
  }

  @AfterDestroy
  static async deleteAttachment(
    model: Emoji,
    options: InstanceDestroyOptions
  ): Promise<void> {
    const attachment = await Attachment.findByPk(model.attachmentId, {
      transaction: options.transaction,
    });
    await attachment?.destroy({ transaction: options.transaction });
  }
}

export default Emoji;
