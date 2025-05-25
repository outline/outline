import fractionalIndex from "fractional-index";
import chunk from "lodash/chunk";
import keyBy from "lodash/keyBy";
import truncate from "lodash/truncate";
import { Fragment, Node } from "prosemirror-model";
import {
  CreateOptions,
  CreationAttributes,
  Transaction,
  UniqueConstraintError,
} from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { randomElement } from "@shared/random";
import { ImportInput, ImportTaskInput } from "@shared/schema";
import {
  ImportableIntegrationService,
  ImportState,
  ImportTaskState,
  MentionType,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import { colorPalette } from "@shared/utils/collections";
import { CollectionValidation } from "@shared/validations";
import collectionDestroyer from "@server/commands/collectionDestroyer";
import { createContext } from "@server/context";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Attachment, Collection, Document, Import, User } from "@server/models";
import ImportTask, {
  ImportTaskAttributes,
  ImportTaskCreationAttributes,
} from "@server/models/ImportTask";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import { Event, ImportEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export const PagePerImportTask = 3;

export default abstract class ImportsProcessor<
  T extends ImportableIntegrationService
> extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "imports.create",
    "imports.processed",
    "imports.delete",
  ];

  /**
   * Run the import processor.
   *
   * @param event The import event
   */
  public async perform(event: ImportEvent) {
    try {
      await sequelize.transaction(async (transaction) => {
        const importModel = await Import.findByPk<Import<T>>(event.modelId, {
          rejectOnEmpty: true,
          paranoid: false,
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (
          !this.canProcess(importModel) ||
          importModel.state === ImportState.Errored ||
          importModel.state === ImportState.Canceled
        ) {
          return;
        }

        switch (event.name) {
          case "imports.create":
            return this.onCreation(importModel, transaction);

          case "imports.processed":
            return this.onProcessed(importModel, transaction);

          case "imports.delete":
            return this.onDeletion(importModel, event, transaction);
        }
      });
    } catch (err) {
      if (event.name !== "imports.delete" && err instanceof Error) {
        const importModel = await Import.findByPk<Import<T>>(event.modelId, {
          rejectOnEmpty: true,
          paranoid: false,
        });
        importModel.error = truncate(err.message, { length: 255 });
        await importModel.save();
      }

      throw err; // throw error for retry.
    }
  }

  public async onFailed(event: ImportEvent) {
    await sequelize.transaction(async (transaction) => {
      const importModel = await Import.findByPk(event.modelId, {
        rejectOnEmpty: true,
      });

      importModel.state = ImportState.Errored;
      await importModel.saveWithCtx(
        createContext({
          user: importModel.createdBy,
          transaction,
        })
      );
    });
  }

  /**
   * Handle "imports.create" event.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Promise that resolves when the creation flow setup is done.
   */
  private async onCreation(importModel: Import<T>, transaction: Transaction) {
    if (!importModel.input.length) {
      return;
    }

    const tasksInput = await this.buildTasksInput(importModel, transaction);

    const importTasks = await Promise.all(
      chunk(tasksInput, PagePerImportTask).map((input) => {
        const attrs = {
          state: ImportTaskState.Created,
          input,
          importId: importModel.id,
        } as ImportTaskCreationAttributes<T>;

        return ImportTask.create<
          ImportTask<T>,
          CreateOptions<ImportTaskAttributes<T>>
        >(attrs as unknown as CreationAttributes<ImportTask<T>>, {
          transaction,
        });
      })
    );

    importModel.state = ImportState.InProgress;
    await importModel.save({ transaction });

    if (importTasks.length > 0) {
      transaction.afterCommit(() => this.scheduleTask(importTasks[0]));
    }
  }

  /**
   * Handle "imports.processed" event.
   * This event is received when all the tasks for the import has been completed.
   * This method is responsible for persisting the collections and documents associated with the import.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Promise that resolves when mapping and persistence is completed.
   */
  private async onProcessed(importModel: Import<T>, transaction: Transaction) {
    try {
      const { collections } = await this.createCollectionsAndDocuments({
        importModel,
        transaction,
      });

      // Once all collections and documents are created, update collection's document structure.
      // This ensures the root documents have the whole subtree available in the structure.
      for (const collection of collections) {
        await Document.unscoped().findAllInBatches<Document>(
          {
            where: { parentDocumentId: null, collectionId: collection.id },
            order: [
              ["createdAt", "DESC"],
              ["id", "ASC"],
            ],
            transaction,
          },
          async (documents) => {
            for (const document of documents) {
              await collection.addDocumentToStructure(document, 0, {
                save: false,
                silent: true,
                transaction,
              });
            }
          }
        );

        await collection.save({ silent: true, transaction });
      }

      importModel.state = ImportState.Completed;
      importModel.error = null; // unset any error from previous attempts.
      await importModel.saveWithCtx(
        createContext({
          user: importModel.createdBy,
          transaction,
        })
      );
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        Logger.error(
          "ImportsProcessor persistence failed due to unique constraint error",
          err,
          {
            fields: err.fields,
          }
        );
      }

      throw err;
    }
  }

  /**
   * Handle "imports.delete" event.
   * This method is responsible for deleting the collections and documents associated with the import.
   *
   * @param importModel Import model associated with the event.
   * @param event Received event.
   * @param transaction Sequelize transaction.
   * @returns Promise that resolves when the collections and documents are deleted.
   */
  private async onDeletion(
    importModel: Import<T>,
    event: ImportEvent,
    transaction: Transaction
  ) {
    if (importModel.state !== ImportState.Completed) {
      return;
    }

    const user = await User.findByPk(event.actorId, {
      rejectOnEmpty: true,
      paranoid: false,
      transaction,
    });

    const collections = await Collection.findAll({
      transaction,
      lock: transaction.LOCK.UPDATE,
      where: {
        teamId: importModel.teamId,
        apiImportId: importModel.id,
      },
    });

    for (const collection of collections) {
      Logger.debug("processor", "Destroying collection created from import", {
        collectionId: collection.id,
      });

      await collectionDestroyer({
        collection,
        transaction,
        user,
        ip: event.ip,
      });
    }
  }

  /**
   * Create collections and documents associated with the import.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Promise of collection models that are created.
   */
  private async createCollectionsAndDocuments({
    importModel,
    transaction,
  }: {
    importModel: Import<T>;
    transaction: Transaction;
  }): Promise<{ collections: Collection[] }> {
    const now = new Date();
    const createdCollections: Collection[] = [];
    // External id to internal model id.
    const idMap: Record<string, string> = {};
    // These will be imported as collections.
    const importInput = keyBy(importModel.input, "externalId");
    const ctx = createContext({ user: importModel.createdBy, transaction });

    const firstCollection = await Collection.findFirstCollectionForUser(
      importModel.createdBy,
      {
        attributes: ["index"],
        transaction,
      }
    );

    let collectionIdx = firstCollection?.index ?? null;

    await ImportTask.findAllInBatches<ImportTask<T>>(
      {
        where: { importId: importModel.id },
        order: [
          ["createdAt", "ASC"],
          ["id", "ASC"], // for stable order when multiple tasks have same "createdAt" value.
        ], // ordering ensures collections are created first.
        batchLimit: 5, // output data per task could be huge, keep a low batch size to prevent OOM.
        transaction,
      },
      async (importTasks) => {
        for (const importTask of importTasks) {
          const outputMap = keyBy(importTask.output ?? [], "externalId");

          for (const input of importTask.input) {
            const externalId = input.externalId;
            const internalId = this.getInternalId(externalId, idMap);

            const parentExternalId = input.parentExternalId;
            const parentInternalId = parentExternalId
              ? this.getInternalId(parentExternalId, idMap)
              : undefined;

            const collectionExternalId = input.collectionExternalId;
            const collectionInternalId = collectionExternalId
              ? this.getInternalId(collectionExternalId, idMap)
              : undefined;

            const output = outputMap[externalId];

            // Skip this item if it has no output (likely due to an error during processing)
            if (!output) {
              Logger.debug(
                "processor",
                `Skipping item with no output: ${externalId}`
              );
              continue;
            }

            const collectionItem = importInput[externalId];

            const attachments = await Attachment.findAll({
              attributes: ["id", "size"],
              where: { documentId: externalId }, // This will be set for root pages too (which will be imported as collection)
              transaction,
            });

            const transformedContent = this.updateMentionsAndAttachments({
              content: output.content,
              attachments,
              importInput,
              idMap,
              actorId: importModel.createdById,
            });

            if (collectionItem) {
              // imported collection will be placed in the beginning.
              collectionIdx = fractionalIndex(null, collectionIdx);

              const description = DocumentHelper.toMarkdown(
                transformedContent,
                {
                  includeTitle: false,
                }
              );

              const collection = Collection.build({
                id: internalId,
                name: output.title,
                icon: output.emoji ?? "collection",
                color: output.emoji ? undefined : randomElement(colorPalette),
                content: transformedContent,
                description: truncate(description, {
                  length: CollectionValidation.maxDescriptionLength,
                }),
                createdById: importModel.createdById,
                teamId: importModel.createdBy.teamId,
                apiImportId: importModel.id,
                index: collectionIdx,
                sort: Collection.DEFAULT_SORT,
                permission: collectionItem.permission,
                createdAt: output.createdAt ?? now,
                updatedAt: output.updatedAt ?? now,
              });

              await collection.saveWithCtx(
                ctx,
                { silent: true },
                {
                  name: "create",
                  data: { name: output.title, source: "import" },
                }
              );

              createdCollections.push(collection);

              // Unset documentId for attachments in collection overview.
              await Attachment.update(
                { documentId: null },
                { where: { documentId: externalId }, silent: true, transaction }
              );

              continue;
            }

            // Document at the root of a collection when there's no parent (or) the parent is the collection.
            const isRootDocument =
              !parentExternalId || !!importInput[parentExternalId];

            const document = Document.build({
              id: internalId,
              title: output.title,
              icon: output.emoji,
              content: transformedContent,
              text: DocumentHelper.toMarkdown(transformedContent, {
                includeTitle: false,
              }),
              collectionId: collectionInternalId,
              parentDocumentId: isRootDocument ? undefined : parentInternalId,
              createdById: importModel.createdById,
              lastModifiedById: importModel.createdById,
              teamId: importModel.createdBy.teamId,
              apiImportId: importModel.id,
              sourceMetadata: {
                externalId,
                externalName: output.title,
                createdByName: output.author,
              },
              createdAt: output.createdAt ?? now,
              updatedAt: output.updatedAt ?? now,
              publishedAt: output.updatedAt ?? output.createdAt ?? now,
            });

            await document.saveWithCtx(
              ctx,
              { silent: true },
              {
                name: "create",
                data: { title: output.title, source: "import" },
              }
            );

            // Update document id for attachments in document content.
            await Attachment.update(
              { documentId: internalId },
              { where: { documentId: externalId }, silent: true, transaction }
            );
          }
        }
      }
    );

    return { collections: createdCollections };
  }

  /**
   * Transform the mentions and attachments in ProseMirrorDoc to their internal references.
   *
   * @param content ProseMirrorDoc that represents collection (or) document content.
   * @param attachments Array of attachment models created for the import.
   * @param idMap Map of internalId to externalId.
   * @param importInput Contains the root externalId and associated info which were used to create the import.
   * @param actorId ID of the user who created the import.
   * @returns Updated ProseMirrorDoc.
   */
  private updateMentionsAndAttachments({
    content,
    attachments,
    idMap,
    importInput,
    actorId,
  }: {
    content: ProsemirrorDoc;
    attachments: Attachment[];
    idMap: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    importInput: Record<string, ImportInput<any>[number]>;
    actorId: string;
  }): ProsemirrorDoc {
    // special case when the doc content is empty.
    if (!content.content.length) {
      return content;
    }

    const attachmentsMap = keyBy(attachments, "id");
    const doc = ProsemirrorHelper.toProsemirror(content);

    const transformMentionNode = (node: Node): Node => {
      const json = node.toJSON() as ProsemirrorData;
      const attrs = json.attrs ?? {};

      attrs.id = uuidv4();
      attrs.actorId = actorId;

      const externalId = attrs.modelId as string;
      attrs.modelId = this.getInternalId(externalId, idMap);

      const isCollectionMention = !!importInput[externalId]; // the referenced externalId is a root page.
      attrs.type = isCollectionMention
        ? MentionType.Collection
        : MentionType.Document;

      json.attrs = attrs;
      return Node.fromJSON(schema, json);
    };

    const transformAttachmentNode = (node: Node): Node => {
      const json = node.toJSON() as ProsemirrorData;
      const attrs = json.attrs ?? {};

      attrs.size = attachmentsMap[attrs.id as string].size;

      json.attrs = attrs;
      return Node.fromJSON(schema, json);
    };

    const transformFragment = (fragment: Fragment): Fragment => {
      const nodes: Node[] = [];

      fragment.forEach((node) => {
        nodes.push(
          node.type.name === "mention"
            ? transformMentionNode(node)
            : node.type.name === "attachment"
            ? transformAttachmentNode(node)
            : node.copy(transformFragment(node.content))
        );
      });

      return Fragment.fromArray(nodes);
    };

    return doc.copy(transformFragment(doc.content)).toJSON();
  }

  /**
   * Get internalId for the given externalId.
   * Returned internalId will be used as "id" for collections and documents created in the import.
   *
   * @param externalId externalId from a source.
   * @param idMap Map of internalId to externalId.
   * @returns Mapped internalId.
   */
  private getInternalId(externalId: string, idMap: Record<string, string>) {
    const internalId = idMap[externalId] ?? uuidv4();
    idMap[externalId] = internalId;
    return internalId;
  }

  /**
   * Determine whether this import can be processed by this processor.
   *
   * @param importModel Import model associated with the import.
   * @returns boolean.
   */
  protected abstract canProcess(importModel: Import<T>): boolean;

  /**
   * Build task inputs which will be used for `APIImportTask`s.
   *
   * @param importInput Array of root externalId and associated info which were used to create the import.
   * @returns `ImportTaskInput`.
   */
  protected abstract buildTasksInput(
    importModel: Import<T>,
    transaction: Transaction
  ): Promise<ImportTaskInput<T>>;

  /**
   * Schedule the first `APIImportTask` for the import.
   *
   * @param importTask ImportTask model associated with the `APIImportTask`.
   * @returns Promise that resolves when the task is scheduled.
   */
  protected abstract scheduleTask(importTask: ImportTask<T>): Promise<void>;
}
