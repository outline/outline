import {
  InferAttributes,
  InferCreationAttributes,
  type SaveOptions,
} from "sequelize";
import {
  BeforeCreate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
import { EmojiValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import IsUrlOrRelativePath from "./validators/IsUrlOrRelativePath";
import Length from "./validators/Length";

@Table({ tableName: "emojis", modelName: "emoji" })
@Fix
class Emoji extends IdModel<
  InferAttributes<Emoji>,
  Partial<InferCreationAttributes<Emoji>>
> {
  @Length({
    max: EmojiValidation.maxNameLength,
    msg: `name must be ${EmojiValidation.maxNameLength} characters or less`,
  })
  @Column(DataType.STRING)
  name: string;

  @IsUrlOrRelativePath
  @Length({
    max: EmojiValidation.maxUrlLength,
    msg: `url must be ${EmojiValidation.maxUrlLength} characters or less`,
  })
  @Column(DataType.STRING)
  url: string;

  // associations

  @BelongsTo(() => Team)
  team: Team;

  @ForeignKey(() => Team)
  @Index
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User)
  createdBy: User;

  @ForeignKey(() => User)
  @Index
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
}

export default Emoji;
