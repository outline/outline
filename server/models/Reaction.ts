import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Comment from "./Comment";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({ tableName: "reactions", modelName: "reaction" })
@Fix
class Reaction extends IdModel<
  InferAttributes<Reaction>,
  Partial<InferCreationAttributes<Reaction>>
> {
  @Length({
    max: 50,
    msg: `emoji must be 50 characters or less`,
  })
  @Column(DataType.STRING)
  emoji: string;

  // associations

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Comment)
  comment: Comment;

  @ForeignKey(() => Comment)
  @Column(DataType.UUID)
  commentId: string;
}

export default Reaction;
