import { Op, WhereOptions } from "sequelize";
import {
  ForeignKey,
  DefaultScope,
  Column,
  BeforeDestroy,
  BelongsTo,
  Table,
  DataType,
} from "sequelize-typescript";
import {
  FileOperationFormat,
  FileOperationState,
  FileOperationType,
} from "@shared/types";
import FileStorage from "@server/storage/files";
import Collection from "./Collection";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";

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
class FileOperation extends ParanoidModel {
  @Column(DataType.ENUM(...Object.values(FileOperationType)))
  type: FileOperationType;

  @Column(DataType.STRING)
  format: FileOperationFormat;

  @Column(DataType.ENUM(...Object.values(FileOperationState)))
  state: FileOperationState;

  @Column
  key: string;

  @Column
  url: string;

  @Column
  error: string | null;

  @Column(DataType.BIGINT)
  size: number;

  @Column(DataType.BOOLEAN)
  includeAttachments: boolean;

  /**
   * Mark the current file operation as expired and remove the file from storage.
   */
  expire = async function () {
    this.state = FileOperationState.Expired;
    try {
      await FileStorage.deleteFile(this.key);
    } catch (err) {
      if (err.retryable) {
        throw err;
      }
    }
    return this.save();
  };

  /**
   * The file operation contents as a readable stream.
   */
  get stream() {
    return FileStorage.getFileStream(this.key);
  }

  // hooks

  @BeforeDestroy
  static async deleteFileFromS3(model: FileOperation) {
    await FileStorage.deleteFile(model.key);
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
