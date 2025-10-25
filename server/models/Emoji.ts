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
    msg: `emoji name must be  less than ${EmojiValidation.maxNameLength} characters`,
  })
  @Column(DataType.STRING)
  name: string;

  @IsUrlOrRelativePath
  @Column(DataType.STRING)
  url: string;

  // associations
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
}

export default Emoji;
