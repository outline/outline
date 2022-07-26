import { subHours } from "date-fns";
import { Op, WhereOptions } from "sequelize";
import {
  ForeignKey,
  DefaultScope,
  Column,
  BeforeDestroy,
  BelongsTo,
  Table,
  DataType,
  AfterValidate,
} from "sequelize-typescript";
import { RateLimitExceededError } from "@server/errors";
import { deleteFromS3, getFileByKey } from "@server/utils/s3";
import Collection from "./Collection";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

export enum FileOperationType {
  Import = "import",
  Export = "export",
}

export enum FileOperationFormat {
  MarkdownZip = "outline-markdown",
  Notion = "notion",
}

export enum FileOperationState {
  Creating = "creating",
  Uploading = "uploading",
  Complete = "complete",
  Error = "error",
  Expired = "expired",
}

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
@Table({ tableName: "file_operations", modelName: "file_operation" })
@Fix
class FileOperation extends IdModel {
  @Column(DataType.ENUM("import", "export"))
  type: FileOperationType;

  @Column(DataType.STRING)
  format: FileOperationFormat;

  @Column(
    DataType.ENUM("creating", "uploading", "complete", "error", "expired")
  )
  state: FileOperationState;

  @Column
  key: string;

  @Column
  url: string;

  @Column
  error: string | null;

  @Column(DataType.BIGINT)
  size: number;

  expire = async function () {
    this.state = "expired";
    await deleteFromS3(this.key);
    await this.save();
  };

  get buffer() {
    return getFileByKey(this.key);
  }

  // hooks

  @BeforeDestroy
  static async deleteFileFromS3(model: FileOperation) {
    await deleteFromS3(model.key);
  }

  @AfterValidate
  static async checkRateLimit(model: FileOperation) {
    const count = await this.countExportsAfterDateTime(
      model.teamId,
      subHours(new Date(), 12),
      {
        type: model.type,
      }
    );

    if (count >= 12) {
      throw RateLimitExceededError();
    }
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  /**
   * Count the number of export file operations for a given team after a point
   * in time.
   *
   * @param teamId The team id
   * @param startDate The start time
   * @returns The number of file operations
   */
  static async countExportsAfterDateTime(
    teamId: string,
    startDate: Date,
    where: WhereOptions<FileOperation> = {}
  ): Promise<number> {
    return this.count({
      where: {
        teamId,
        createdAt: {
          [Op.gt]: startDate,
        },
        ...where,
      },
    });
  }
}

export default FileOperation;
