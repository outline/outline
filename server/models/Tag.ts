import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BeforeValidate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  NotEmpty,
  Table,
} from "sequelize-typescript";
import DocumentTag from "./DocumentTag";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({ tableName: "tags", modelName: "tag" })
@Fix
class Tag extends IdModel<
  InferAttributes<Tag>,
  Partial<InferCreationAttributes<Tag>>
> {
  @NotEmpty
  @Length({ max: 255, msg: "name must be 255 characters or less" })
  @Column(DataType.STRING)
  name: string;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string | null;

  @HasMany(() => DocumentTag, "tagId")
  documentTags: DocumentTag[];

  // hooks

  @BeforeValidate
  static normalizeName(model: Tag) {
    model.name = model.name.trim().toLowerCase();
  }
}

export default Tag;
