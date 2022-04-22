import invariant from "invariant";
import attachmentCreator from "@server/commands/attachmentCreator";
import documentCreator from "@server/commands/documentCreator";
import { sequelize } from "@server/database/sequelize";
import { ValidationError } from "@server/errors";
import logger from "@server/logging/logger";
import {
  User,
  Event,
  Document,
  Collection,
  FileOperation,
  Attachment,
} from "@server/models";
import { FileOperationState } from "@server/models/FileOperation";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  fileOperationId: string;
};

/**
 * Standardized format for data importing, to be used by all import tasks.
 */
export type StructuredImportData = {
  collections: {
    id: string;
    name: string;
    description?: string;
  }[];
  documents: {
    id: string;
    title: string;
    text: string;
    collectionId: string;
    updatedAt?: Date;
    createdAt?: Date;
    parentDocumentId?: string;
  }[];
  attachments: {
    id: string;
    name: string;
    path: string;
    mimeType: string;
    buffer: Buffer;
  }[];
};

export default abstract class ImportTask extends BaseTask<Props> {
  /**
   * Runs the import task.
   *
   * @param props The props
   */
  public async perform({ fileOperationId }: Props) {
    const fileOperation = await FileOperation.findByPk(fileOperationId);
    invariant(fileOperation, "fileOperation not found");

    try {
      logger.info("task", `ImportTask fetching data for ${fileOperationId}`);
      const data = await this.fetchData(fileOperation);

      logger.info("task", `ImportTask parsing data for ${fileOperationId}`);
      const parsed = await this.parseData(data, fileOperation);

      if (parsed.collections.length === 0) {
        throw ValidationError(
          "Uploaded file does not contain any collections. The root of the zip file must contain folders representing collections."
        );
      }

      if (parsed.documents.length === 0) {
        throw ValidationError(
          "Uploaded file does not contain any importable documents"
        );
      }

      logger.info("task", `ImportTask persisting data for ${fileOperationId}`);
      const result = await this.persistData(parsed, fileOperation);

      await this.updateFileOperation(
        fileOperation,
        FileOperationState.Complete
      );

      return result;
    } catch (error) {
      await this.updateFileOperation(
        fileOperation,
        FileOperationState.Error,
        error
      );
      throw error;
    }
  }

  /**
   * Update the state of the underlying FileOperation in the database and send
   * an event to the client.
   *
   * @param fileOperation The FileOperation to update
   */
  private async updateFileOperation(
    fileOperation: FileOperation,
    state: FileOperationState,
    error?: Error
  ) {
    await fileOperation.update({ state, error: error?.message });
    await Event.schedule({
      name: "fileOperations.update",
      modelId: fileOperation.id,
      teamId: fileOperation.teamId,
      actorId: fileOperation.userId,
    });
  }

  /**
   * Fetch the remote data needed for the import, by default this will download
   * any file associated with the FileOperation, save it to a temporary file,
   * and return the path.
   *
   * @param fileOperation The FileOperation to fetch data for
   * @returns string
   */
  protected async fetchData(fileOperation: FileOperation) {
    return fileOperation.buffer;
  }

  /**
   * Parse the data loaded from fetchData into a consistent structured format
   * that represents collections, documents, and the relationships between them.
   *
   * @param data The data loaded from fetchData
   * @returns A promise that resolves to the structured data
   */
  protected abstract parseData(
    data: any,
    fileOperation: FileOperation
  ): Promise<StructuredImportData>;

  /**
   * Persist the data that was already fetched and parsed into the consistent
   * structured data.
   *
   * @param props The props
   */
  protected async persistData(
    data: StructuredImportData,
    fileOperation: FileOperation
  ): Promise<{
    collections: Map<string, Collection>;
    documents: Map<string, Document>;
    attachments: Map<string, Attachment>;
  }> {
    const collections = new Map<string, Collection>();
    const documents = new Map<string, Document>();
    const attachments = new Map<string, Attachment>();

    return sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(fileOperation.userId, {
        transaction,
      });
      invariant(user, "User not found");

      const ip = user.lastActiveIp || undefined;

      // Collections
      for (const item of data.collections) {
        // check if collection with name exists
        const response = await Collection.findOrCreate({
          where: {
            teamId: fileOperation.teamId,
            name: item.name,
          },
          defaults: {
            id: item.id,
            description: item.description,
            createdById: fileOperation.userId,
            permission: "read_write",
          },
          transaction,
        });

        let collection = response[0];
        const isCreated = response[1];

        // create new collection if name already exists, yes it's possible that
        // there is also a "Name (Imported)" but this is a case not worth dealing
        // with right now
        if (!isCreated) {
          const name = `${item.name} (Imported)`;
          collection = await Collection.create(
            {
              id: item.id,
              description: item.description,
              teamId: fileOperation.teamId,
              createdById: fileOperation.userId,
              name,
              permission: "read_write",
            },
            { transaction }
          );
          await Event.create(
            {
              name: "collections.create",
              collectionId: collection.id,
              teamId: collection.teamId,
              actorId: fileOperation.userId,
              data: {
                name,
              },
              ip,
            },
            {
              transaction,
            }
          );
        }

        collections.set(item.id, collection);
      }

      // Attachments
      for (const item of data.attachments) {
        const attachment = await attachmentCreator({
          source: "import",
          name: item.name,
          type: item.mimeType,
          buffer: item.buffer,
          user,
          ip,
          transaction,
        });
        attachments.set(item.id, attachment);
      }

      // Documents
      for (const item of data.documents) {
        let text = item.text;

        // Check all of the attachments we've created against urls in the text
        // and replace them out with attachment redirect urls before saving.
        for (const item of data.attachments) {
          const attachment = attachments.get(item.id);
          if (!attachment) {
            continue;
          }

          // TODO: This is a bit specific to MarkdownZip import and could be
          // made more generic on the next pass.
          // Pull the collection and subdirectory out of the path name, upload
          // folders in an export are relative to the document itself
          const normalizedAttachmentPath = item.path.replace(
            /(.*)uploads\//,
            "uploads/"
          );

          text = text
            .replace(item.path, attachment.redirectUrl)
            .replace(normalizedAttachmentPath, attachment.redirectUrl)
            .replace(`/${normalizedAttachmentPath}`, attachment.redirectUrl);
        }

        const document = await documentCreator({
          source: "import",
          id: item.id,
          title: item.title,
          text,
          collectionId: item.collectionId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt ?? item.createdAt,
          publishedAt: item.updatedAt ?? item.createdAt ?? new Date(),
          parentDocumentId: item.parentDocumentId,
          user,
          ip,
          transaction,
        });
        documents.set(item.id, document);

        const collection = collections.get(item.collectionId);
        if (collection) {
          await collection.addDocumentToStructure(document, 0, { transaction });
        }
      }

      // Return value is only used for testing
      return {
        collections,
        documents,
        attachments,
      };
    });
  }

  /**
   * Optional hook to remove any temporary files that were created
   */
  protected async cleanupData() {
    // noop
  }

  /**
   * Job options such as priority and retry strategy, as defined by Bull.
   */
  public get options() {
    return {
      priority: TaskPriority.Low,
      attempts: 1,
    };
  }
}
