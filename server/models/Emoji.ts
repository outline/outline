import {
  InferAttributes,
  InferCreationAttributes,
  type SaveOptions,
} from "sequelize";
import {
  BeforeCreate,
  BeforeDestroy,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { EmojiValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import { Matches } from "class-validator";
import FileStorage from "@server/storage/files";
import Attachment from "./Attachment";

@Table({ tableName: "emojis", modelName: "emoji" })
@Fix
class Emoji extends IdModel<
  InferAttributes<Emoji>,
  Partial<InferCreationAttributes<Emoji>>
> {
  @Length({
    max: EmojiValidation.maxNameLength,
    msg: `emoji name must be less than ${EmojiValidation.maxNameLength} characters`,
  })
  @Matches(EmojiValidation.allowedNameCharacters, {
    message:
      "emoji name can only contain lowercase letters, numbers, and underscores",
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

  @BeforeDestroy
  static async deleteAttachmentFromS3(model: Emoji) {
    const attachment = await Attachment.findByPk(model.attachmentId);
    if (attachment) {
      await FileStorage.deleteFile(attachment.key);
    }
  }
}

export default Emoji;
