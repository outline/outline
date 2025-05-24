import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
import { EmojiValidation } from "@shared/validations";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
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
}

export default Emoji;
