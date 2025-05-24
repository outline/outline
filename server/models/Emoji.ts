import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
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
    max: 50,
    msg: `name must be 50 characters or less`,
  })
  @Column(DataType.STRING)
  name: string;

  @Length({
    max: 500,
    msg: `url must be 500 characters or less`,
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
