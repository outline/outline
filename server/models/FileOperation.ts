import type {
  InferAttributes,
  InferCreationAttributes,
  WhereOptions,
} from "sequelize";
import { Op } from "sequelize";
import {
  ForeignKey,
  DefaultScope,
  Column,
  BeforeDestroy,
  BelongsTo,
  Table,
  DataType,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import type { CollectionPermission, FileOperationFormat } from "@shared/types";
import { FileOperationState, FileOperationType } from "@shared/types";
import FileStorage from "@server/storage/files";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import { Buckets } from "./helpers/AttachmentHelper";

export type FileOperationOptions = {
  includeAttachments?: boolean;
  includePrivate?: boolean;
  permission?: CollectionPermission | null;
};

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
      required: false,
      paranoid: false,
    },
    {
      model: Document.scope("withDrafts"),
      as: "document",
      required: false,
      paranoid: false,
    },
  ],
}))
@Table({ tableName: "file_operations", modelName: "file_operation" })
@Fix
class FileOperation extends ParanoidModel<
  InferAttributes<FileOperation>,
  Partial<InferCreationAttributes<FileOperation>>
> {
  static eventNamespace = "fileOperations";

  @Column(DataType.ENUM(...Object.values(FileOperationType)))
  type: FileOperationType;

  @Column(DataType.STRING)
  format: FileOperationFormat;

  @Column(DataType.ENUM(...Object.values(FileOperationState)))
  state: FileOperationState;

  @Column
  key: string;

  @Column
  url?: string | null;

  @Column
  error: string | null;

  @Column(DataType.BIGINT)
  size: number;

  /**
   * Additional configuration options for the file operation.
   */
  @Column(DataType.JSON)
  options: FileOperationOptions | null;

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

  /**
   * The file operation contents as a handle which contains a path and cleanup function.
   */
  get handle() {
    return FileStorage.getFileHandle(this.key);
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
  collection: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @BelongsTo(() => Document, "documentId")
  document: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId?: string | null;

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

  static getExportKey({
    name,
    teamId,
    format,
  }: {
    name: string;
    teamId: string;
    format: FileOperationFormat;
  }) {
    return `${
      Buckets.uploads
    }/${teamId}/${uuidv4()}/${name}-export.${format.replace(/outline-/, "")}.zip`;
  }
}

export default FileOperation;
