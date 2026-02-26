import fs from "fs-extra";
import truncate from "lodash/truncate";
import type { NavigationNode } from "@shared/types";
import { FileOperationState, NotificationEventType } from "@shared/types";
import { bytesToHumanReadable } from "@shared/utils/files";
import ExportFailureEmail from "@server/emails/templates/ExportFailureEmail";
import ExportSuccessEmail from "@server/emails/templates/ExportSuccessEmail";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import {
  Attachment,
  Collection,
  Document,
  Event,
  FileOperation,
  Team,
  User,
} from "@server/models";
import fileOperationPresenter from "@server/presenters/fileOperation";
import FileStorage from "@server/storage/files";
import { BaseTask, TaskPriority } from "./base/BaseTask";
import { Op } from "sequelize";
import { sequelizeReadOnly } from "@server/storage/database";
import type { WhereOptions } from "sequelize";

type Props = {
  fileOperationId: string;
};

export default abstract class ExportTask extends BaseTask<Props> {
  /**
   * Transforms the data to be exported, uploads, and notifies user.
   *
   * @param props The props
   */
  public async perform({ fileOperationId }: Props) {
    Logger.info("task", `ExportTask fetching data for ${fileOperationId}`);
    const fileOperation = await FileOperation.findByPk(fileOperationId, {
      rejectOnEmpty: true,
    });
    const [team, user] = await Promise.all([
      Team.findByPk(fileOperation.teamId, { rejectOnEmpty: true }),
      User.findByPk(fileOperation.userId, { rejectOnEmpty: true }),
    ]);

    let filePath: string | undefined;
    let readStream: fs.ReadStream | undefined;

    try {
      Logger.info("task", `ExportTask processing data for ${fileOperationId}`, {
        options: fileOperation.options,
      });

      await this.updateFileOperation(fileOperation, {
        state: FileOperationState.Creating,
      });

      filePath = await this.loadDataAndExport(fileOperation, user);

      Logger.info("task", `ExportTask uploading data for ${fileOperationId}`);

      await this.updateFileOperation(fileOperation, {
        state: FileOperationState.Uploading,
      });

      const stat = await fs.stat(filePath);
      readStream = fs.createReadStream(filePath);
      const url = await FileStorage.store({
        body: readStream,
        contentLength: stat.size,
        contentType: "application/zip",
        key: fileOperation.key,
        acl: "private",
      });

      await this.updateFileOperation(fileOperation, {
        size: stat.size,
        state: FileOperationState.Complete,
        url,
      });

      if (user.subscribedToEventType(NotificationEventType.ExportCompleted)) {
        await new ExportSuccessEmail({
          to: user.email,
          userId: user.id,
          id: fileOperation.id,
          teamUrl: team.url,
          teamId: team.id,
        }).schedule();
      }
    } catch (error) {
      await this.updateFileOperation(fileOperation, {
        state: FileOperationState.Error,
        error,
      });
      if (user.subscribedToEventType(NotificationEventType.ExportCompleted)) {
        await new ExportFailureEmail({
          to: user.email,
          userId: user.id,
          teamUrl: team.url,
          teamId: team.id,
        }).schedule();
      }
      throw error;
    } finally {
      // Destroy the read stream first to release the file handle before deletion
      if (readStream) {
        readStream.destroy();
      }
      if (filePath) {
        void fs.unlink(filePath).catch((error) => {
          Logger.error(`Failed to delete temporary file ${filePath}`, error);
        });
      }
    }
  }

  public async loadDataAndExport(
    fileOperation: FileOperation,
    user: User
  ): Promise<string> {
    if (fileOperation.documentId) {
      const document = await Document.findByPk(fileOperation.documentId!, {
        include: {
          model: Collection.scope("withDocumentStructure"),
          as: "collection",
        },
        rejectOnEmpty: true,
      });

      const documentStructure = document.collection?.getDocumentTree(
        document.id
      );

      if (!documentStructure) {
        throw new Error("Document not found in collection tree");
      }

      return this.exportDocument(document, documentStructure.children ?? []);
    }

    // ensure attachment size is within limits
    if (!fileOperation.collectionId) {
      const totalAttachmentsSize = await Attachment.getTotalSizeForTeam(
        sequelizeReadOnly,
        user.teamId
      );

      if (
        fileOperation.options?.includeAttachments &&
        env.MAXIMUM_EXPORT_SIZE &&
        totalAttachmentsSize > env.MAXIMUM_EXPORT_SIZE
      ) {
        throw ValidationError(
          `${bytesToHumanReadable(
            totalAttachmentsSize
          )} of attachments in workspace is larger than maximum export size of ${bytesToHumanReadable(
            env.MAXIMUM_EXPORT_SIZE
          )}.`
        );
      }
    }

    const where: WhereOptions<Collection> = {
      teamId: user.teamId,
    };

    if (!fileOperation.options?.includePrivate) {
      where.permission = {
        [Op.ne]: null,
      };
    }

    if (fileOperation.collectionId) {
      where.id = fileOperation.collectionId;
    } else {
      where.archivedAt = {
        [Op.eq]: null,
      };
    }

    const collections = await Collection.scope("withDocumentStructure").findAll(
      {
        where,
      }
    );

    return this.exportCollections(collections, fileOperation);
  }

  /**
   * Transform the data in all of the passed collections into a single Buffer.
   *
   * @param collections The collections to export
   * @returns A promise that resolves to a temporary file path
   */
  protected abstract exportCollections(
    collections: Collection[],
    fileOperation: FileOperation
  ): Promise<string>;

  /**
   * Transform the data in the document into a single Buffer.
   *
   * @param document The document to export
   * @param documentStructure Structure of document's children
   * @param fileOperation File operation associated with the export
   * @returns A promise that resolves to a temporary file path
   */
  protected abstract exportDocument(
    document: Document,
    documentStructure: NavigationNode[]
  ): Promise<string>;

  /**
   * Update the state of the underlying FileOperation in the database and send
   * an event to the client.
   *
   * @param fileOperation The FileOperation to update
   */
  private async updateFileOperation(
    fileOperation: FileOperation,
    options: Partial<FileOperation> & { error?: Error }
  ) {
    await fileOperation.update(
      {
        ...options,
        error: options.error
          ? truncate(options.error.message, { length: 255 })
          : undefined,
      },
      {
        hooks: false,
      }
    );

    await Event.schedule({
      name: "fileOperations.update",
      modelId: fileOperation.id,
      teamId: fileOperation.teamId,
      actorId: fileOperation.userId,
      data: fileOperationPresenter(fileOperation),
    });
  }

  /**
   * Job options such as priority and retry strategy, as defined by Bull.
   */
  public get options() {
    return {
      priority: TaskPriority.Background,
      attempts: 1,
    };
  }
}
