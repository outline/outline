import type {
  FindOptions,
  Identifier,
  InferAttributes,
  InferCreationAttributes,
  NonNullFindOptions,
  WhereOptions,
} from "sequelize";
import { EmptyResultError, Op } from "sequelize";
import {
  ForeignKey,
  DefaultScope,
  Scopes,
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
import { ValidateKey } from "@server/validation";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import { Buckets } from "./helpers/AttachmentHelper";

export type FileOperationOptions = {
  includeAttachments?: boolean;
  includePrivate?: boolean;
  permission?: CollectionPermission | null;
};

type AdditionalFindOptions = {
  userId?: string;
  rejectOnEmpty?: boolean | Error;
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
      model: Document.unscoped(),
      as: "document",
      attributes: ["id", "title"],
      required: false,
      paranoid: false,
    },
  ],
}))
@Scopes(() => ({
  withSource: (userId: string) => {
    if (!userId) {
      return {};
    }

    return {
      include: [
        {
          model: User,
          as: "user",
          paranoid: false,
        },
        {
          model: Collection.scope([
            "defaultScope",
            {
              method: ["withMembership", userId],
            },
          ]),
          as: "collection",
          required: false,
          paranoid: false,
        },
        {
          model: Document.scope([
            "defaultScope",
            {
              method: ["withMembership", userId, false],
            },
          ]),
          as: "document",
          // Content columns are not needed to authorize or present an export.
          attributes: { exclude: ["text", "content", "state"] },
          required: false,
          paranoid: false,
        },
      ],
    };
  },
}))
@Table({ tableName: "file_operations", modelName: "file_operation" })
class FileOperation extends ParanoidModel<
  InferAttributes<FileOperation>,
  Partial<InferCreationAttributes<FileOperation>>
> {
  static eventNamespace = "fileOperations";

  /** The number of days a completed file operation remains downloadable. */
  static expiryDays = 15;

  /**
   * Overrides the standard findByPk behavior to allow loading the exported
   * collection or document with memberships for a user passed in by `userId`.
   *
   * @param id uuid
   * @param options FindOptions
   * @returns a promise resolving to a file operation instance or null.
   */
  static async findByPk(
    id: Identifier,
    options?: NonNullFindOptions<FileOperation> & AdditionalFindOptions
  ): Promise<FileOperation>;
  static async findByPk(
    id: Identifier,
    options?: FindOptions<FileOperation> & AdditionalFindOptions
  ): Promise<FileOperation | null>;
  static async findByPk(
    id: Identifier,
    options: FindOptions<FileOperation> & AdditionalFindOptions = {}
  ): Promise<FileOperation | null> {
    if (typeof id !== "string") {
      return null;
    }

    const { userId, ...rest } = options;

    // Preserve the caller's scope when no userId is passed
    const scope = userId
      ? this.scope({ method: ["withSource", userId] })
      : this;

    const fileOperation = await scope.findOne({
      ...rest,
      where: { id },
      rejectOnEmpty: false,
    });

    if (!fileOperation && rest.rejectOnEmpty) {
      throw rest.rejectOnEmpty instanceof Error
        ? rest.rejectOnEmpty
        : new EmptyResultError(`File operation doesn't exist with id: ${id}`);
    }

    return fileOperation;
  }

  @Column(DataType.ENUM(...Object.values(FileOperationType)))
  type: FileOperationType;

  @Column(DataType.STRING)
  format: FileOperationFormat;

  @Column(DataType.ENUM(...Object.values(FileOperationState)))
  state: FileOperationState;

  @Column(DataType.STRING)
  key: string;

  @Column(DataType.STRING)
  url?: string | null;

  @Column(DataType.STRING)
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
  expire = async () => {
    this.state = FileOperationState.Expired;
    try {
      await FileStorage.deleteFile(this.key);
    } catch (err) {
      if (err instanceof Error && "retryable" in err && err.retryable) {
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
      where: Object.assign(
        {
          teamId,
          createdAt: {
            [Op.gt]: startDate,
          },
        },
        where
      ),
    });
  }

  /**
   * Get the storage key to write an export archive to.
   *
   * @param name the user-provided name of the exported source.
   * @param teamId the team id.
   * @param format the format of the export.
   * @returns a storage key.
   */
  static getExportKey({
    name,
    teamId,
    format,
  }: {
    name: string;
    teamId: string;
    format: FileOperationFormat;
  }) {
    const fileName = ValidateKey.sanitizeSegment(
      `${name}-export.${format.replace(/outline-/, "")}.zip`
    );

    return `${Buckets.uploads}/${teamId}/${uuidv4()}/${fileName}`;
  }
}

export default FileOperation;
