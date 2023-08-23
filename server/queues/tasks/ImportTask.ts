import truncate from "lodash/truncate";
import {
  CollectionPermission,
  CollectionSort,
  FileOperationState,
} from "@shared/types";
import { CollectionValidation } from "@shared/validations";
import attachmentCreator from "@server/commands/attachmentCreator";
import documentCreator from "@server/commands/documentCreator";
import { serializer } from "@server/editor";
import { InternalError, ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import {
  User,
  Event,
  Document,
  Collection,
  FileOperation,
  Attachment,
} from "@server/models";
import { sequelize } from "@server/storage/database";
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
    urlId?: string;
    color?: string;
    icon?: string | null;
    sort?: CollectionSort;
    permission?: CollectionPermission | null;
    name: string;
    /**
     * The collection description. To reference an attachment or image use the
     * special formatting <<attachmentId>>. It will be replaced with a reference
     * to the actual attachment as part of persistData.
     *
     * To reference a document use <<documentId>>, it will be replaced with a
     * link to the document as part of persistData once the document url is
     * generated.
     */
    description?: string | Record<string, any> | null;
    /** Optional id from import source, useful for mapping */
    sourceId?: string;
  }[];
  documents: {
    id: string;
    urlId?: string;
    title: string;
    /**
     * The document text. To reference an attachment or image use the special
     * formatting <<attachmentId>>. It will be replaced with a reference to the
     * actual attachment as part of persistData.
     *
     * To reference another document use <<documentId>>, it will be replaced
     * with a link to the document as part of persistData once the document url
     * is generated.
     */
    text: string;
    data?: Record<string, any>;
    collectionId: string;
    updatedAt?: Date;
    createdAt?: Date;
    publishedAt?: Date | null;
    parentDocumentId?: string | null;
    createdById?: string;
    createdByEmail?: string | null;
    path: string;
    /** Optional id from import source, useful for mapping */
    sourceId?: string;
  }[];
  attachments: {
    id: string;
    name: string;
    path: string;
    mimeType: string;
    buffer: () => Promise<Buffer>;
    /** Optional id from import source, useful for mapping */
    sourceId?: string;
  }[];
};

export default abstract class ImportTask extends BaseTask<Props> {
  /**
   * Runs the import task.
   *
   * @param props The props
   */
  public async perform({ fileOperationId }: Props) {
    const fileOperation = await FileOperation.findByPk(fileOperationId, {
      rejectOnEmpty: true,
    });

    try {
      Logger.info("task", `ImportTask fetching data for ${fileOperationId}`);
      const data = await this.fetchData(fileOperation);
      if (!data) {
        throw InternalError("Failed to fetch data for import from storage.");
      }

      Logger.info("task", `ImportTask parsing data for ${fileOperationId}`);
      const parsed = await this.parseData(data, fileOperation);

      if (parsed.collections.length === 0) {
        throw ValidationError(
          "Uploaded file does not contain any valid collections. It may be corrupt, the wrong type, or version."
        );
      }

      if (parsed.documents.length === 0) {
        throw ValidationError(
          "Uploaded file does not contain any valid documents"
        );
      }

      let result;
      try {
        Logger.info(
          "task",
          `ImportTask persisting data for ${fileOperationId}`
        );
        result = await this.persistData(parsed, fileOperation);
      } catch (error) {
        Logger.error(
          `ImportTask failed to persist data for ${fileOperationId}`,
          error
        );
        throw new Error("Sorry, an internal error occurred during import");
      }

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
    await fileOperation.update({
      state,
      error: error ? truncate(error.message, { length: 255 }) : undefined,
    });
    await Event.schedule({
      name: "fileOperations.update",
      modelId: fileOperation.id,
      teamId: fileOperation.teamId,
      actorId: fileOperation.userId,
    });
  }

  /**
   * Fetch the remote data associated with the file operation as a Buffer.
   *
   * @param fileOperation The FileOperation to fetch data for
   * @returns A promise that resolves to the data as a buffer.
   */
  protected async fetchData(fileOperation: FileOperation): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const bufs: Buffer[] = [];
      const stream = fileOperation.stream;
      if (!stream) {
        return reject(new Error("No stream available"));
      }

      stream.on("data", function (d) {
        bufs.push(d);
      });
      stream.on("error", reject);
      stream.on("end", () => {
        resolve(Buffer.concat(bufs));
      });
    });
  }

  /**
   * Parse the data loaded from fetchData into a consistent structured format
   * that represents collections, documents, and the relationships between them.
   *
   * @param data The data loaded from fetchData
   * @returns A promise that resolves to the structured data
   */
  protected abstract parseData(
    data: Buffer | NodeJS.ReadableStream,
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

    try {
      return await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(fileOperation.userId, {
          transaction,
          rejectOnEmpty: true,
        });

        const ip = user.lastActiveIp || undefined;

        // Attachments
        await Promise.all(
          data.attachments.map(async (item) => {
            Logger.debug("task", `ImportTask persisting attachment ${item.id}`);
            const attachment = await attachmentCreator({
              source: "import",
              id: item.id,
              name: item.name,
              type: item.mimeType,
              buffer: await item.buffer(),
              user,
              ip,
              transaction,
            });
            attachments.set(item.id, attachment);
          })
        );

        // Collections
        for (const item of data.collections) {
          Logger.debug("task", `ImportTask persisting collection ${item.id}`);
          let description = item.description;

          // Description can be markdown text or a Prosemirror object if coming
          // from JSON format. In that case we need to serialize to Markdown.
          if (description instanceof Object) {
            description = serializer.serialize(description);
          }

          if (description) {
            // Check all of the attachments we've created against urls in the text
            // and replace them out with attachment redirect urls before saving.
            for (const aitem of data.attachments) {
              const attachment = attachments.get(aitem.id);
              if (!attachment) {
                continue;
              }
              description = description.replace(
                new RegExp(`<<${attachment.id}>>`, "g"),
                attachment.redirectUrl
              );
            }

            // Check all of the document we've created against urls in the text
            // and replace them out with a valid internal link. Because we are doing
            // this before saving, we can't use the document slug, but we can take
            // advantage of the fact that the document id will redirect in the client
            for (const ditem of data.documents) {
              description = description.replace(
                new RegExp(`<<${ditem.id}>>`, "g"),
                `/doc/${ditem.id}`
              );
            }
          }

          const options: { urlId?: string } = {};
          if (item.urlId) {
            const existing = await Collection.unscoped().findOne({
              attributes: ["id"],
              transaction,
              where: {
                urlId: item.urlId,
              },
            });

            if (!existing) {
              options.urlId = item.urlId;
            }
          }

          const truncatedDescription = description
            ? truncate(description, {
                length: CollectionValidation.maxDescriptionLength,
              })
            : null;

          // check if collection with name exists
          const response = await Collection.findOrCreate({
            where: {
              teamId: fileOperation.teamId,
              name: item.name,
            },
            defaults: {
              ...options,
              id: item.id,
              description: truncatedDescription,
              createdById: fileOperation.userId,
              permission: CollectionPermission.ReadWrite,
              importId: fileOperation.id,
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
                ...options,
                id: item.id,
                description: truncatedDescription,
                color: item.color,
                icon: item.icon,
                sort: item.sort,
                teamId: fileOperation.teamId,
                createdById: fileOperation.userId,
                name,
                permission: item.permission ?? CollectionPermission.ReadWrite,
                importId: fileOperation.id,
              },
              { transaction }
            );
          }

          await Event.create(
            {
              name: "collections.create",
              collectionId: collection.id,
              teamId: collection.teamId,
              actorId: fileOperation.userId,
              data: {
                name: collection.name,
              },
              ip,
            },
            {
              transaction,
            }
          );

          collections.set(item.id, collection);
        }

        // Documents
        for (const item of data.documents) {
          Logger.debug("task", `ImportTask persisting document ${item.id}`);
          let text = item.text;

          // Check all of the attachments we've created against urls in the text
          // and replace them out with attachment redirect urls before saving.
          for (const aitem of data.attachments) {
            const attachment = attachments.get(aitem.id);
            if (!attachment) {
              continue;
            }
            text = text.replace(
              new RegExp(`<<${attachment.id}>>`, "g"),
              attachment.redirectUrl
            );
          }

          // Check all of the document we've created against urls in the text
          // and replace them out with a valid internal link. Because we are doing
          // this before saving, we can't use the document slug, but we can take
          // advantage of the fact that the document id will redirect in the client
          for (const ditem of data.documents) {
            text = text.replace(
              new RegExp(`<<${ditem.id}>>`, "g"),
              `/doc/${ditem.id}`
            );
          }

          const options: { urlId?: string } = {};
          if (item.urlId) {
            const existing = await Document.unscoped().findOne({
              attributes: ["id"],
              transaction,
              where: {
                urlId: item.urlId,
              },
            });

            if (!existing) {
              options.urlId = item.urlId;
            }
          }

          const document = await documentCreator({
            ...options,
            source: "import",
            id: item.id,
            title: item.title,
            text,
            collectionId: item.collectionId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt ?? item.createdAt,
            publishedAt: item.updatedAt ?? item.createdAt ?? new Date(),
            parentDocumentId: item.parentDocumentId,
            importId: fileOperation.id,
            user,
            ip,
            transaction,
          });
          documents.set(item.id, document);

          const collection = collections.get(item.collectionId);
          if (collection) {
            await collection.addDocumentToStructure(document, 0, {
              transaction,
            });
          }
        }

        // Return value is only used for testing
        return {
          collections,
          documents,
          attachments,
        };
      });
    } catch (err) {
      Logger.info(
        "task",
        `Removing ${attachments.size} attachments on failure`
      );

      await Promise.all(
        Array.from(attachments.values()).map((model) =>
          Attachment.deleteAttachmentFromS3(model)
        )
      );
      throw err;
    }
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
