import { DataTypes } from "sequelize";
import {
  ForeignKey,
  DefaultScope,
  Column,
  BeforeDestroy,
  BelongsTo,
  Table,
} from "sequelize-typescript";
import { deleteFromS3 } from "@server/utils/s3";
import Collection from "./Collection";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";

@DefaultScope(() => ({
  include: [
    {
      model: User,
      as: "user",
      paranoid: false,
    },
    {
      model: Collection,
      as: "collection",
      paranoid: false,
    },
  ],
}))
@Table({ tableName: "attachments", modelName: "attachment" })
class FileOperation extends BaseModel {
  @Column(DataTypes.ENUM("import", "export"))
  type: "import" | "export";

  @Column(
    DataTypes.ENUM("creating", "uploading", "complete", "error", "expired")
  )
  state: "creating" | "uploading" | "complete" | "error" | "expired";

  @Column
  key: string;

  @Column
  url: string;

  @Column(DataTypes.BIGINT)
  size: number;

  expire = async function () {
    this.state = "expired";
    await deleteFromS3(this.key);
    await this.save();
  };

  // hooks

  @BeforeDestroy
  static async deleteFileFromS3(model: FileOperation) {
    await deleteFromS3(model.key);
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column
  collectionId: string;
}

export default FileOperation;
