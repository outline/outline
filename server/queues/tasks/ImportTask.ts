import path from "path";
import fs from "fs-extra";
import chunk from "lodash/chunk";
import truncate from "lodash/truncate";
import { InferCreationAttributes } from "sequelize";
import tmp from "tmp";
import {
  AttachmentPreset,
  CollectionPermission,
  CollectionSort,
  FileOperationState,
  ProsemirrorData,
} from "@shared/types";
import { CollectionValidation } from "@shared/validations";
import attachmentCreator from "@server/commands/attachmentCreator";
import documentCreator from "@server/commands/documentCreator";
import { createContext } from "@server/context";
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
import ZipHelper from "@server/utils/ZipHelper";
import { generateUrlId } from "@server/utils/url";
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
    color?: string | null;
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
    externalId?: string;
  }[];
  documents: {
    id: string;
    urlId?: string;
    title: string;
    emoji?: string | null;
    icon?: string | null;
    color?: string | null;
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
    createdByName?: string;
    createdByEmail?: string | null;
    path: string;
    mimeType: string;
    /** Optional id from import source, useful for mapping */
    externalId?: string;
  }[];
  attachments: {
    id: string;
    name: string;
    path: string;
    mimeType: string;
    buffer: () => Promise<Buffer>;
    /** Optional id from import source, useful for mapping */
    externalId?: string;
  }[];
};

export default abstract class ImportTask extends BaseTask<Props> {
  /**
   * Runs the import task.
   *
   * @param props The props
   */
  public async perform({ fileOperationId }: Props) {
    let dirPath;
    const fileOperation = await FileOperation.findByPk(fileOperationId, {
      rejectOnEmpty: true,
    });

    try {
      Logger.info("task", `ImportTask fetching data for ${fileOperationId}`);
      dirPath = await this.fetchAndExtractData(fileOperation);
      if (!dirPath) {
        throw InternalError("Failed to fetch data for import from storage.");
      }

      Logger.info("task", `ImportTask parsing data for ${fileOperationId}`, {
        dirPath,
      });
      const parsed = await this.parseData(dirPath, fileOperation);

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
    } finally {
      if (dirPath) {
        await this.cleanupExtractedData(dirPath, fileOperation);
      }
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
    await fileOperation.update(
      {
        state,
        error: error ? truncate(error.message, { length: 255 }) : undefined,
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
    });
  }

  /**
   * Fetch the remote data associated with the file operation into a temporary disk location.
   *
   * @param fileOperation The FileOperation to fetch data for
   * @returns A promise that resolves to the temporary file path.
   */
  protected async fetchAndExtractData(
    fileOperation: FileOperation
  ): Promise<string> {
    let cleanup;
    let filePath: string;

    try {
      const res = await fileOperation.handle;
      filePath = res.path;
      cleanup = res.cleanup;

      const path = await new Promise<string>((resolve, reject) => {
        tmp.dir((err, tmpDir) => {
          if (err) {
            Logger.error("Could not create temporary directory", err);
            return reject(err);
          }

          Logger.debug(
            "task",
            `ImportTask extracting data for ${fileOperation.id}`
          );

          void ZipHelper.extract(filePath, tmpDir)
            .then(() => resolve(tmpDir))
            .catch((zErr) => {
              Logger.error("Could not extract zip file", zErr);
              reject(zErr);
            });
        });
      });

      return path;
    } finally {
      Logger.debug(
        "task",
        `ImportTask cleaning up temporary data for ${fileOperation.id}`
      );

      await cleanup?.();
    }
  }

  /**
   * Cleanup the temporary directory where the data was fetched and extracted.
   *
   * @param dirPath The temporary directory path where the data was fetched
   * @param fileOperation The associated FileOperation
   */
  protected async cleanupExtractedData(
    dirPath: string,
    fileOperation: FileOperation
  ) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      Logger.error(
        `ImportTask failed to cleanup extracted data for ${fileOperation.id}`,
        error
      );
    }
  }

  /**
   * Parse the data loaded from fetchAndExtractData into a consistent structured format
   * that represents collections, documents, and the relationships between them.
   *
   * @param dirPath The temporary directory path where the data was fetched
   * @param fileOperation The FileOperation to parse data for
   * @returns A promise that resolves to the structured data
   */
  protected abstract parseData(
    dirPath: string,
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

    const user = await User.findByPk(fileOperation.userId, {
      rejectOnEmpty: true,
    });
    const ip = user.lastActiveIp || undefined;

    try {
      await this.preprocessDocUrlIds(data);

      // Collections
      for (const item of data.collections) {
        await sequelize.transaction(async (transaction) => {
          Logger.debug(
            "task",
            `ImportTask persisting collection ${item.name} (${item.id})`
          );
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
              description = description.replace(
                new RegExp(`<<${aitem.id}>>`, "g"),
                Attachment.getRedirectUrl(aitem.id)
              );
            }

            // Check all of the document we've created against urls in the text
            // and replace them out with a valid internal link.
            for (const ditem of data.documents) {
              description = description.replace(
                new RegExp(`<<${ditem.id}>>`, "g"),
                Document.getPath({ title: ditem.title, urlId: ditem.urlId! })
              );
            }
          }

          const options: { urlId?: string } = {};
          if (item.urlId) {
            const existing = await Collection.unscoped().findOne({
              attributes: ["id"],
              paranoid: false,
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

          const sharedDefaults: Partial<InferCreationAttributes<Collection>> = {
            ...options,
            id: item.id,
            description: truncatedDescription,
            color: item.color,
            icon: item.icon,
            sort: item.sort,
            createdById: fileOperation.userId,
            permission:
              item.permission ?? fileOperation.options?.permission !== undefined
                ? fileOperation.options?.permission
                : CollectionPermission.ReadWrite,
            importId: fileOperation.id,
          };

          // check if collection with name exists
          const response = await Collection.findOrCreate({
            where: {
              teamId: fileOperation.teamId,
              name: item.name,
            },
            defaults: sharedDefaults,
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
                ...sharedDefaults,
                name,
                teamId: fileOperation.teamId,
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

          // Documents
          for (const item of data.documents.filter(
            (d) => d.collectionId === collection.id
          )) {
            Logger.debug(
              "task",
              `ImportTask persisting document ${item.title} (${item.id})`
            );
            let text = item.text;

            // Check all of the attachments we've created against urls in the text
            // and replace them out with attachment redirect urls before saving.
            for (const aitem of data.attachments) {
              text = text.replace(
                new RegExp(`<<${aitem.id}>>`, "g"),
                Attachment.getRedirectUrl(aitem.id)
              );
            }

            // Check all of the document we've created against urls in the text
            // and replace them out with a valid internal link.
            for (const ditem of data.documents) {
              text = text.replace(
                new RegExp(`<<${ditem.id}>>`, "g"),
                Document.getPath({ title: ditem.title, urlId: ditem.urlId! })
              );
            }

            const document = await documentCreator({
              sourceMetadata: {
                fileName: path.basename(item.path),
                mimeType: item.mimeType,
                externalId: item.externalId,
                createdByName: item.createdByName,
              },
              id: item.id,
              title: item.title,
              urlId: item.urlId,
              text,
              content: item.data ? (item.data as ProsemirrorData) : undefined,
              collectionId: item.collectionId,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt ?? item.createdAt,
              publishedAt: item.updatedAt ?? item.createdAt ?? new Date(),
              parentDocumentId: item.parentDocumentId,
              importId: fileOperation.id,
              user,
              ctx: createContext({ user, transaction }),
            });
            documents.set(item.id, document);

            await collection.addDocumentToStructure(document, 0, {
              transaction,
              save: false,
            });
          }

          await collection.save({ transaction });
        });
      }

      // Attachments
      await sequelize.transaction(async (transaction) => {
        const chunks = chunk(data.attachments, 10);

        for (const chunk of chunks) {
          // Parallelize 10 uploads at a time
          await Promise.all(
            chunk.map(async (item) => {
              Logger.debug(
                "task",
                `ImportTask persisting attachment ${item.name} (${item.id})`
              );
              const attachment = await attachmentCreator({
                source: "import",
                preset: AttachmentPreset.DocumentAttachment,
                id: item.id,
                name: item.name,
                type: item.mimeType,
                buffer: await item.buffer(),
                user,
                ctx: createContext({ user, transaction }),
              });
              if (attachment) {
                attachments.set(item.id, attachment);
              }
            })
          );
        }
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

    // Return value is only used for testing
    return {
      collections,
      documents,
      attachments,
    };
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

  private async preprocessDocUrlIds(data: StructuredImportData) {
    for (const doc of data.documents) {
      // check DB only if urlId is present in the input.
      if (doc.urlId) {
        const existing = await Document.unscoped().findOne({
          attributes: ["id"],
          paranoid: false,
          where: {
            urlId: doc.urlId,
          },
        });

        if (!existing) {
          continue;
        }
      }

      doc.urlId = generateUrlId();
    }
  }
}
