import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BeforeSave,
  Column,
  DataType,
  BelongsTo,
  HasMany,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import DocumentTag from "./DocumentTag";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "tags", modelName: "tag" })
@Fix
class Tag extends IdModel<
  InferAttributes<Tag>,
  Partial<InferCreationAttributes<Tag>>
> {
  @Column
  name: string;

  @BeforeSave
  static normalizeName(model: Tag) {
    model.name = model.name.trim().toLowerCase();
  }

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
}

export default Tag;
