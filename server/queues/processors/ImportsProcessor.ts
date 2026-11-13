import fractionalIndex from "fractional-index";
import { chunk, keyBy, truncate } from "es-toolkit/compat";
import { Fragment, Node } from "prosemirror-model";
import type { CreateOptions, CreationAttributes, Transaction } from "sequelize";
import { Op, UniqueConstraintError } from "sequelize";
import { randomUUID } from "node:crypto";
import { randomElement } from "@shared/random";
import type {
  BaseImportInput,
  BaseImportTaskInput,
  ImportInput,
  ImportTaskInput,
} from "@shared/schema";
import type {
  ImportableIntegrationService,
  ProsemirrorData,
  ProsemirrorDoc,
  SourceMetadata,
} from "@shared/types";
import {
  ImportState,
  ImportTaskPhase,
  ImportTaskState,
  MentionType,
} from "@shared/types";
import { colorPalette } from "@shared/constants";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { errToString } from "@shared/utils/error";
import { CollectionValidation } from "@shared/validations";
import documentMover from "@server/commands/documentMover";
import { createContext } from "@server/context";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import {
  Attachment,
  Collection,
  Document,
  GroupMembership,
  Import,
  User,
  UserMembership,
} from "@server/models";
import type {
  ImportTaskAttributes,
  ImportTaskCreationAttributes,
} from "@server/models/ImportTask";
import ImportTask from "@server/models/ImportTask";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import { afterCommit } from "@server/storage/transaction";
import type { Event, ImportEvent } from "@server/types";
import { generateUrlId } from "@server/utils/url";
import BaseProcessor from "./BaseProcessor";

export const PagePerImportTask = 3;

/**
 * Resolved import destination. When present, root nodes are materialized as
 * documents under `collection` (at its root, or nested beneath `document`)
 * rather than as new collections.
 */
type ImportDestination = {
  collection: Collection;
  document?: Document;
};

export default abstract class ImportsProcessor<
  T extends ImportableIntegrationService,
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
    let sourceAttachment: Attachment | null = null;

    try {
      sourceAttachment = await sequelize.transaction(async (transaction) => {
        const importModel = await Import.findByPk<Import<T>>(event.modelId, {
          rejectOnEmpty: true,
          paranoid: false,
          transaction,
          lock: { level: transaction.LOCK.NO_KEY_UPDATE, of: Import },
        });

        if (
          !this.canProcess(importModel) ||
          importModel.state === ImportState.Errored ||
          importModel.state === ImportState.Canceled
        ) {
          return null;
        }

        switch (event.name) {
          case "imports.create":
            await this.onCreation(importModel, transaction);
            return null;

          case "imports.processed":
            return this.onProcessed(importModel, transaction);

          case "imports.delete":
            await this.onDeletion(importModel, event, transaction);
            return null;
        }

        return null;
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

    if (!sourceAttachment) {
      return;
    }

    try {
      await sourceAttachment.destroy();
    } catch (err) {
      Logger.warn("Failed to delete source attachment after import", {
        attachmentId: sourceAttachment.id,
        importId: event.modelId,
        message: errToString(err),
        teamId: event.teamId,
      });
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
    const tasksInput = importModel.input.length
      ? await this.buildTasksInput(importModel, transaction)
      : [];

    // Without tasks nothing would move the import out of its current state.
    if (!tasksInput.length) {
      importModel.state = ImportState.Errored;
      importModel.error = "Nothing to import";
      await importModel.saveWithCtx(
        createContext({ user: importModel.createdBy, transaction })
      );
      return;
    }

    const phase = this.getInitialPhase();

    const importTasks = await Promise.all(
      chunk(tasksInput as BaseImportTaskInput, PagePerImportTask).map(
        (input) => {
          const attrs = {
            state: ImportTaskState.Created,
            phase,
            input,
            importId: importModel.id,
          } as ImportTaskCreationAttributes<T>;

          return ImportTask.create<
            ImportTask<T>,
            CreateOptions<ImportTaskAttributes<T>>
          >(attrs as unknown as CreationAttributes<ImportTask<T>>, {
            transaction,
          });
        }
      )
    );

    importModel.state = ImportState.InProgress;
    await importModel.save({ transaction });

    await afterCommit(transaction, () => this.scheduleTask(importTasks[0]));
  }

  /**
   * Handle "imports.processed" event.
   * This event is received when all the tasks for the import has been completed.
   * This method is responsible for persisting the collections and documents associated with the import.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Source attachment to delete after the transaction commits.
   */
  private async onProcessed(
    importModel: Import<T>,
    transaction: Transaction
  ): Promise<Attachment | null> {
    try {
      const { collections, destination } =
        await this.createCollectionsAndDocuments({
          importModel,
          transaction,
        });

      if (destination) {
        // Import targeted an existing destination — no collections were
        // created. Append each top-of-import document (parented to the
        // destination document, or the collection root) into the destination
        // collection's structure. addDocumentToStructure pulls the whole
        // subtree, so only the top-level rows need iterating.
        await Document.unscoped().findAllInBatches<Document>(
          {
            where: {
              apiImportId: importModel.id,
              collectionId: destination.collection.id,
              parentDocumentId: destination.document?.id ?? null,
            },
            order: [
              ["createdAt", "ASC"],
              ["id", "ASC"],
            ],
            transaction,
          },
          async (documents) => {
            for (const document of documents) {
              await destination.collection.addDocumentToStructure(
                document,
                undefined,
                {
                  save: false,
                  transaction,
                  insertOrder: "append",
                }
              );
            }
          }
        );

        // Save with a ctx event (not silent) so WebsocketsProcessor pushes the
        // refreshed structure to clients — a pre-existing collection receives
        // no `collections.create` event.
        await destination.collection.saveWithCtx(
          createContext({ user: importModel.createdBy, transaction }),
          undefined,
          { name: "update" }
        );
      } else {
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
                await collection.addDocumentToStructure(document, undefined, {
                  save: false,
                  silent: true,
                  transaction,
                  insertOrder: "append",
                });
              }
            }
          );

          await collection.save({ silent: true, transaction });
        }
      }

      const storageKey = importModel.scratch?.storageKey;
      importModel.state = ImportState.Completed;
      importModel.scratch = null;
      importModel.error = null; // unset any error from previous attempts.
      await importModel.saveWithCtx(
        createContext({
          user: importModel.createdBy,
          transaction,
        })
      );

      if (storageKey) {
        return Attachment.findOne({
          where: {
            key: storageKey,
            teamId: importModel.teamId,
          },
          transaction,
        });
      }

      return null;
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

    const ctx = createContext({ user, ip: event.ip, transaction });

    // Collections created by this import (destination mode creates none — a
    // pre-existing destination collection has no apiImportId, so it's skipped).
    const collections = await Collection.findAll({
      transaction,
      lock: transaction.LOCK.NO_KEY_UPDATE,
      where: {
        teamId: importModel.teamId,
        apiImportId: importModel.id,
      },
    });

    for (const collection of collections) {
      Logger.debug("processor", "Destroying collection created from import", {
        collectionId: collection.id,
      });
      await collection.destroyWithCtx(ctx);
    }

    // Documents created by this import that live in a pre-existing destination
    // (the destination itself has no apiImportId, so it survives).
    const created = await Document.unscoped().findAll({
      attributes: ["id", "collectionId", "parentDocumentId"],
      transaction,
      where: {
        teamId: importModel.teamId,
        apiImportId: importModel.id,
      },
    });

    if (created.length === 0) {
      return;
    }

    const importedIds = new Set(created.map((doc) => doc.id));
    const importedById = new Map(
      created.map((document) => [document.id, document])
    );

    // Lock every affected collection before inspecting descendants. This
    // prevents a concurrent move or publish from changing the document tree
    // while unrelated subtrees are moved away from documents being deleted.
    const collectionIds = [
      ...new Set(
        created.flatMap((document) =>
          document.collectionId ? [document.collectionId] : []
        )
      ),
    ].sort();
    for (const collectionId of collectionIds) {
      await Collection.findByPk(collectionId, {
        includeDocumentStructure: true,
        lock: transaction.LOCK.NO_KEY_UPDATE,
        paranoid: false,
        transaction,
      });
    }

    // A document added below imported content after the import completed must
    // survive deletion of the import. Move each such subtree to the nearest
    // parent that was not created by this import before deleting imported rows.
    const children = await Document.unscoped().findAll({
      transaction,
      lock: transaction.LOCK.NO_KEY_UPDATE,
      where: {
        parentDocumentId: { [Op.in]: [...importedIds] },
      },
    });
    const unrelatedChildren = children.filter(
      (document) => document.apiImportId !== importModel.id
    );

    for (const document of unrelatedChildren) {
      let parentDocumentId = document.parentDocumentId;
      while (parentDocumentId && importedIds.has(parentDocumentId)) {
        const importedParent = importedById.get(parentDocumentId);
        if (!importedParent) {
          break;
        }
        parentDocumentId = importedParent.parentDocumentId;
      }

      await documentMover(ctx, {
        document,
        collectionId: document.collectionId ?? null,
        parentDocumentId,
      });
    }

    const topLevelIds = created
      .filter(
        (doc) => !doc.parentDocumentId || !importedIds.has(doc.parentDocumentId)
      )
      .map((doc) => doc.id);

    // Deleting an archived document does not cascade, so every imported id is
    // visited. Top-level ids go first, and cascaded documents are skipped below.
    for (const id of new Set([...topLevelIds, ...importedIds])) {
      const document = await Document.findByPk(id, {
        userId: user.id,
        transaction,
      });
      if (!document) {
        continue;
      }
      Logger.debug("processor", "Destroying document created from import", {
        documentId: document.id,
      });
      await document.destroyWithCtx(ctx);
    }
  }

  /**
   * Create the collections and documents associated with the import. Root
   * nodes materialize as new collections by default, or as documents under an
   * existing destination when the import specifies one.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Promise of the created collections and the resolved destination.
   */
  private async createCollectionsAndDocuments({
    importModel,
    transaction,
  }: {
    importModel: Import<T>;
    transaction: Transaction;
  }): Promise<{
    collections: Collection[];
    destination: ImportDestination | null;
  }> {
    const now = new Date();
    const createdCollections: Collection[] = [];
    // External id to internal model id.
    const idMap: Record<string, string> = {};
    // Cache of resolved external author → internal user id (or undefined when
    // no match). Reused across every output in the import.
    const userIdCache = new Map<string, string | undefined>();
    // The import's root nodes. Widened to the base input shape because the
    // abstract class has no narrowed view of T.
    const rootNodesByExternalId = keyBy(
      importModel.input as BaseImportInput,
      "externalId"
    );
    const ctx = createContext({ user: importModel.createdBy, transaction });

    const destination = await this.resolveDestination(importModel, transaction);

    // When a synthetic root node collapses in destination mode, its loose
    // child documents parent directly to the destination. `null` means the
    // destination collection root; a string means the destination document.
    const rootParentOverride: Record<string, string | null> = {};

    // Destination-mode documents are created unpublished (see below) and then
    // published in a second pass that doesn't trigger the collection-structure
    // hook. Collected here as (id, publishedAt) so original dates are kept.
    const pendingPublish: { id: string; publishedAt: Date }[] = [];

    // Only compute a fractional index for new collections; skip the query
    // entirely when importing into a destination.
    let collectionIdx: string | null = null;
    if (!destination) {
      const firstCollection = await Collection.findFirstCollectionForUser(
        importModel.createdBy,
        {
          attributes: ["index"],
          transaction,
        }
      );
      collectionIdx = firstCollection?.index ?? null;
    }

    // Pre-pass: allocate new urlIds for every collection and document in this
    // import so internal link hrefs in document content can be rewritten to
    // point at the new paths during persistence. The map is keyed by the old
    // urlId from the export, which is what appears in `/doc/<slug>-<urlId>`
    // and `/collection/<slug>-<urlId>` link hrefs. `kind` records whether the
    // node materialized as a collection or a document so the rewrite picks the
    // right path builder — a root node is only a collection when there's no
    // destination.
    const urlIdMap: Record<
      string,
      { urlId: string; title: string; kind: "collection" | "document" }
    > = {};

    await ImportTask.findAllInBatches<ImportTask<T>>(
      {
        where: { importId: importModel.id },
        order: [
          ["createdAt", "ASC"],
          ["id", "ASC"],
        ],
        batchLimit: 5,
        transaction,
      },
      async (importTasks) => {
        for (const importTask of importTasks) {
          for (const output of importTask.output ?? []) {
            if (!output.urlId || urlIdMap[output.urlId]) {
              continue;
            }
            const isCollection =
              !destination && !!rootNodesByExternalId[output.externalId];
            const allocated = isCollection
              ? await this.preserveCollectionUrlId(output.urlId, transaction)
              : await this.preserveDocumentUrlId(output.urlId, transaction);
            urlIdMap[output.urlId] = {
              urlId: allocated,
              title: output.title,
              kind: isCollection ? "collection" : "document",
            };
          }
        }
      }
    );

    await ImportTask.findAllInBatches<ImportTask<T>>(
      {
        where: { importId: importModel.id },
        order: [
          ["createdAt", "ASC"],
          ["id", "ASC"], // for stable order when multiple tasks have same "createdAt" value.
        ], // ordering ensures root nodes are created first.
        batchLimit: 5, // output data per task could be huge, keep a low batch size to prevent OOM.
        transaction,
      },
      async (importTasks) => {
        for (const importTask of importTasks) {
          const outputMap = keyBy(importTask.output ?? [], "externalId");

          for (const input of importTask.input) {
            const externalId = input.externalId;
            const internalId = await this.getInternalId(externalId, idMap);
            const parentExternalId = input.parentExternalId;
            const parentInternalId = parentExternalId
              ? await this.getInternalId(parentExternalId, idMap)
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

            const rootNode = rootNodesByExternalId[externalId];

            // documentId is set for root pages too.
            const attachments = await Attachment.findAll({
              attributes: ["id", "size"],
              where: { documentId: externalId, teamId: importModel.teamId },
              transaction,
            });

            const transformedContent = await this.rewriteReferences({
              content: output.content,
              attachments,
              rootNodesByExternalId,
              hasDestination: !!destination,
              idMap,
              urlIdMap,
              actorId: importModel.createdById,
              teamId: importModel.teamId,
            });

            const resolvedCreatedById =
              (await this.resolveExternalUserId(
                output,
                importModel.teamId,
                userIdCache,
                transaction
              )) ?? importModel.createdById;

            const urlId = output.urlId
              ? urlIdMap[output.urlId]?.urlId
              : undefined;

            // Root node without a destination → materialize a Collection.
            if (rootNode && !destination) {
              // imported collection will be placed in the beginning.
              collectionIdx = fractionalIndex(null, collectionIdx);

              const description = await DocumentHelper.toMarkdown(
                transformedContent,
                {
                  includeTitle: false,
                }
              );

              // Build sourceMetadata for the collection
              const sourceMetadata: SourceMetadata = {
                externalId: externalId,
                externalName: output.title,
                createdByName: output.author,
              };

              const collection = Collection.build({
                id: internalId,
                urlId,
                name: output.title,
                icon: output.icon ?? "collection",
                color:
                  output.color ??
                  (output.icon ? undefined : randomElement(colorPalette)),
                content: transformedContent,
                description: truncate(description, {
                  length: CollectionValidation.maxDescriptionLength,
                }),
                createdById: resolvedCreatedById,
                teamId: importModel.createdBy.teamId,
                apiImportId: importModel.id,
                index: collectionIdx,
                sort: Collection.DEFAULT_SORT,
                permission: rootNode.permission,
                sourceMetadata,
                createdAt: output.createdAt ?? now,
                updatedAt: output.updatedAt ?? now,
              });

              await collection.saveWithCtx(
                ctx,
                { silent: true },
                {
                  name: "create",
                }
              );

              createdCollections.push(collection);

              // Unset documentId for attachments in collection overview.
              await Attachment.update(
                { documentId: null },
                {
                  where: { documentId: externalId, teamId: importModel.teamId },
                  silent: true,
                  transaction,
                }
              );

              continue;
            }

            // Synthetic root node in destination mode → materialize nothing;
            // its loose child documents parent directly to the destination.
            if (rootNode && destination && rootNode.synthetic) {
              rootParentOverride[externalId] = destination.document?.id ?? null;
              continue;
            }

            // Resolve the collection and parent for a document. In destination
            // mode every document lives in the destination collection; root
            // nodes and root-level documents parent to the destination
            // document (or the collection root), everything else to its parent.
            const isRootDocument =
              !parentExternalId || !!rootNodesByExternalId[parentExternalId];

            let collectionId: string | undefined;
            let parentDocumentId: string | undefined;
            const inputRootExternalId =
              input.rootExternalId ?? input.collectionExternalId;

            if (destination) {
              collectionId = destination.collection.id;

              if (rootNode) {
                // A materialized root document parents to the destination.
                parentDocumentId = destination.document?.id;
              } else if (isRootDocument) {
                const rootExternalId = parentExternalId ?? inputRootExternalId;
                if (rootExternalId && rootExternalId in rootParentOverride) {
                  // Synthetic-root child → parent directly to the destination.
                  parentDocumentId =
                    rootParentOverride[rootExternalId] ?? undefined;
                } else {
                  // Non-synthetic root → parent to the materialized root doc.
                  parentDocumentId = rootExternalId
                    ? await this.getInternalId(rootExternalId, idMap)
                    : destination.document?.id;
                }
              } else {
                parentDocumentId = parentInternalId;
              }
            } else {
              collectionId = inputRootExternalId
                ? await this.getInternalId(inputRootExternalId, idMap)
                : undefined;
              parentDocumentId = isRootDocument ? undefined : parentInternalId;
            }

            const publishedAt =
              output.publishedAt ?? output.updatedAt ?? output.createdAt ?? now;

            const defaults = {
              title: output.title,
              urlId,
              icon: output.icon,
              color: output.color,
              content: transformedContent,
              text: await DocumentHelper.toMarkdown(transformedContent, {
                includeTitle: false,
              }),
              collectionId,
              parentDocumentId,
              createdById: resolvedCreatedById,
              lastModifiedById: resolvedCreatedById,
              teamId: importModel.createdBy.teamId,
              apiImportId: importModel.id,
              sourceMetadata: {
                externalId,
                externalName: output.title,
                createdByName: output.author,
              },
              createdAt: output.createdAt ?? now,
              updatedAt: output.updatedAt ?? now,
              // In destination mode the document is created unpublished so
              // Document's AfterCreate structure hook (which opens its own
              // transaction and locks the pre-existing collection) is a no-op —
              // it would otherwise deadlock against this transaction's FK lock.
              // publishedAt is applied below and the structure is built in
              // onProcessed, mirroring how a new collection is invisible to that
              // hook in the default path.
              publishedAt: destination ? null : publishedAt,
            };

            try {
              const [document, created] = await Document.findOrCreateWithCtx(
                ctx,
                {
                  where: {
                    id: internalId,
                  },
                  defaults,
                  silent: true,
                },
                {
                  name: "create",
                  data: { title: output.title, source: "import" },
                }
              );

              if (destination && created && parentDocumentId) {
                await Promise.all([
                  GroupMembership.copy(
                    { documentId: parentDocumentId },
                    document,
                    { transaction }
                  ),
                  UserMembership.copy(
                    { documentId: parentDocumentId },
                    document,
                    { transaction }
                  ),
                ]);
              }
            } catch (err) {
              if (err instanceof UniqueConstraintError) {
                Logger.error(
                  `ImportsProcessor document creation failed due to unique constraint error (${internalId}: ${defaults.title})`,
                  err,
                  {
                    fields: err.fields,
                    documentId: internalId,
                    title: defaults.title,
                    collectionId: defaults.collectionId,
                    parentDocumentId: defaults.parentDocumentId,
                  }
                );
              }
              throw err;
            }

            if (destination) {
              pendingPublish.push({ id: internalId, publishedAt });
            }

            // Update document id for attachments in document content.
            await Attachment.update(
              { documentId: internalId },
              {
                where: { documentId: externalId, teamId: importModel.teamId },
                silent: true,
                transaction,
              }
            );
          }
        }
      }
    );

    // Publish destination-mode documents now that every row exists. hooks are
    // disabled so the AfterCreate structure hook never runs — onProcessed
    // builds the destination collection's structure instead.
    for (const { id, publishedAt } of pendingPublish) {
      await Document.unscoped().update(
        { publishedAt },
        { where: { id }, transaction, hooks: false, silent: true }
      );
    }

    return { collections: createdCollections, destination };
  }

  /**
   * Resolve the optional destination for the import. A document destination is
   * re-resolved at persistence time so a mid-import move is reflected.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns The resolved destination, or null when none is set.
   * @throws Error when a document destination is missing, soft-deleted, or
   *   archived — `onFailed` then flips the import to Errored.
   */
  private async resolveDestination(
    importModel: Import<T>,
    transaction: Transaction
  ): Promise<ImportDestination | null> {
    if (importModel.documentId) {
      // Lock the collection before the document to match documentMover's lock
      // order. If the document moved between the initial read and the lock,
      // retry against its current collection.
      for (let attempt = 0; attempt < 3; attempt++) {
        const document = await Document.unscoped().findOne({
          where: { id: importModel.documentId },
          transaction,
        });
        if (!document || document.archivedAt || !document.collectionId) {
          break;
        }

        const collection = await Collection.findByPk(document.collectionId, {
          includeDocumentStructure: true,
          lock: transaction.LOCK.NO_KEY_UPDATE,
          transaction,
          rejectOnEmpty: true,
        });
        const lockedDocument = await Document.unscoped().findOne({
          where: { id: importModel.documentId },
          lock: transaction.LOCK.NO_KEY_UPDATE,
          transaction,
        });
        if (
          lockedDocument &&
          !lockedDocument.archivedAt &&
          lockedDocument.collectionId === collection.id
        ) {
          return { collection, document: lockedDocument };
        }
      }

      throw new Error(
        `Import destination document ${importModel.documentId} is no longer available`
      );
    }

    if (importModel.collectionId) {
      const collection = await Collection.findByPk(importModel.collectionId, {
        includeDocumentStructure: true,
        lock: transaction.LOCK.NO_KEY_UPDATE,
        transaction,
        rejectOnEmpty: true,
      });
      return { collection };
    }

    return null;
  }

  /**
   * Rewrite the mentions, attachments, and internal document/collection link
   * marks in a ProseMirrorDoc so they resolve against the imported models
   * rather than the source export.
   *
   * @param content ProseMirrorDoc that represents collection (or) document content.
   * @param attachments Array of attachment models created for the import.
   * @param idMap Map of internalId to externalId.
   * @param urlIdMap Map of old urlId to the newly allocated urlId, title, and
   *   materialized kind, used to rewrite `/doc/<slug>-<urlId>` and
   *   `/collection/<slug>-<urlId>` link hrefs to the correct new path.
   * @param rootNodesByExternalId The import's root nodes keyed by externalId.
   * @param hasDestination Whether the import targets an existing destination —
   *   when true root-node references become document mentions/links.
   * @param actorId ID of the user who created the import.
   * @returns Updated ProseMirrorDoc.
   */
  private async rewriteReferences({
    content,
    attachments,
    idMap,
    urlIdMap,
    rootNodesByExternalId,
    hasDestination,
    actorId,
    teamId,
  }: {
    content: ProsemirrorDoc;
    attachments: Attachment[];
    idMap: Record<string, string>;
    urlIdMap: Record<
      string,
      { urlId: string; title: string; kind: "collection" | "document" }
    >;
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    rootNodesByExternalId: Record<string, ImportInput<any>[number]>;
    hasDestination: boolean;
    actorId: string;
    teamId: string;
  }): Promise<ProsemirrorDoc> {
    // special case when the doc content is empty.
    if (!content.content.length) {
      return content;
    }

    const attachmentsMap = keyBy(attachments, "id");
    const doc = ProsemirrorHelper.toProsemirror(content);
    const linkMarkType = schema.marks.link;

    const transformMentionNode = async (node: Node): Promise<Node> => {
      const json = node.toJSON() as ProsemirrorData;
      const attrs = json.attrs ?? {};

      attrs.id = randomUUID();
      attrs.actorId = actorId;

      const externalId = attrs.modelId as string;
      attrs.modelId = await this.getInternalId(externalId, idMap, teamId);

      // A root-node reference is a collection mention only when the import
      // materializes collections; in destination mode it becomes a document.
      const isCollectionMention =
        !hasDestination && !!rootNodesByExternalId[externalId];
      attrs.type = isCollectionMention
        ? MentionType.Collection
        : MentionType.Document;

      json.attrs = attrs;
      return Node.fromJSON(schema, json);
    };

    const transformAttachmentNode = (node: Node): Node => {
      const json = node.toJSON() as ProsemirrorData;
      const attrs = json.attrs ?? {};

      attrs.size = attachmentsMap[attrs.id as string]?.size;

      json.attrs = attrs;
      return Node.fromJSON(schema, json);
    };

    const rewriteInternalLinkHref = (href: string): string => {
      // Match either a `/doc/` or `/collection/` href; the destination path is
      // chosen by the mapped node's materialized kind, not the source path, so
      // a `/collection/` link whose node became a document (destination mode)
      // rewrites to a `/doc/` path rather than a non-existent collection path.
      const match = /^\/(?:doc|collection)\/([^/?#]+)(.*)$/.exec(href);
      if (!match) {
        return href;
      }
      const slugMatch = UrlHelper.SLUG_URL_REGEX.exec(match[1]);
      const mapped = slugMatch ? urlIdMap[slugMatch[1]] : undefined;
      if (!mapped) {
        return href;
      }
      const path =
        mapped.kind === "collection"
          ? Collection.getPath({ name: mapped.title, urlId: mapped.urlId })
          : Document.getPath({ title: mapped.title, urlId: mapped.urlId });
      return path + match[2];
    };

    const transformLinkMarks = (node: Node): Node => {
      if (!node.marks.length) {
        return node;
      }
      let changed = false;
      const newMarks = node.marks.map((mark) => {
        if (mark.type !== linkMarkType) {
          return mark;
        }
        const href = mark.attrs.href as string | undefined;
        if (!href) {
          return mark;
        }
        const newHref = rewriteInternalLinkHref(href);
        if (newHref === href) {
          return mark;
        }
        changed = true;
        return linkMarkType.create({ ...mark.attrs, href: newHref });
      });
      return changed ? node.mark(newMarks) : node;
    };

    const transformFragment = async (fragment: Fragment): Promise<Fragment> => {
      const nodePromises: Promise<Node>[] = [];

      fragment.forEach((node) => {
        if (node.type.name === "mention") {
          nodePromises.push(transformMentionNode(node));
        } else if (node.type.name === "attachment") {
          nodePromises.push(Promise.resolve(transformAttachmentNode(node)));
        } else {
          nodePromises.push(
            transformFragment(node.content).then((transformedContent) =>
              transformLinkMarks(node.copy(transformedContent))
            )
          );
        }
      });

      const nodes = await Promise.all(nodePromises);
      return Fragment.fromArray(nodes);
    };

    return doc.copy(await transformFragment(doc.content)).toJSON();
  }

  /**
   * Get internalId for the given externalId.
   * Returned internalId will be used as "id" for collections and documents created in the import.
   *
   * @param teamId teamId associated with the import.
   * @param externalId externalId from a source.
   * @param idMap Map of internalId to externalId.
   * @returns Mapped internalId.
   */
  private async getInternalId(
    externalId: string,
    idMap: Record<string, string>,
    teamId?: string
  ) {
    let internalId = idMap[externalId];

    if (!internalId && teamId) {
      const existingId = (
        await Document.findOne({
          attributes: ["id"],
          where: {
            teamId,
            sourceMetadata: {
              externalId,
            },
          },
        })
      )?.id;

      if (existingId) {
        return existingId;
      }
    }

    // Mentions are transformed concurrently, so another call can assign an id
    // while the lookup above is awaited. Keep the first id assigned.
    idMap[externalId] ??= randomUUID();
    return idMap[externalId];
  }

  /**
   * Resolves the original author of an imported item to a user in the target
   * team. Tries `createdById` first then falls back to `createdByEmail`; both
   * hits and misses are cached. Returns `undefined` when no match is found so
   * the caller can fall back to the importing user.
   *
   * @param output The ImportTaskOutput entry carrying optional original-author
   *               fields from the source.
   * @param teamId Team to scope the lookup to.
   * @param cache Map reused across calls within one persistence pass.
   * @param transaction Active sequelize transaction.
   * @returns The matched internal user id, or undefined.
   */
  private async resolveExternalUserId(
    output: { createdById?: string; createdByEmail?: string | null },
    teamId: string,
    cache: Map<string, string | undefined>,
    transaction: Transaction
  ): Promise<string | undefined> {
    if (output.createdById) {
      const cacheKey = `id:${output.createdById}`;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const user = await User.findOne({
        where: { id: output.createdById, teamId },
        transaction,
      });
      if (user) {
        cache.set(cacheKey, user.id);
        return user.id;
      }
      cache.set(cacheKey, undefined);
    }

    if (output.createdByEmail) {
      const email = output.createdByEmail.toLowerCase().trim();
      const cacheKey = `email:${email}`;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const user = await User.findOne({
        where: { email, teamId },
        transaction,
      });
      if (user) {
        cache.set(cacheKey, user.id);
        if (output.createdById) {
          cache.set(`id:${output.createdById}`, user.id);
        }
        return user.id;
      }
      cache.set(cacheKey, undefined);
    }

    return undefined;
  }

  /**
   * Honors a urlId from a document export if it does not collide with an
   * existing Document, otherwise generates a fresh one.
   *
   * @param sourceUrlId The urlId requested by the importer.
   * @param transaction Active sequelize transaction.
   * @returns A urlId to use.
   */
  private async preserveDocumentUrlId(
    sourceUrlId: string,
    transaction: Transaction
  ): Promise<string> {
    const existing = await Document.unscoped().findOne({
      attributes: ["id"],
      paranoid: false,
      where: { urlId: sourceUrlId },
      transaction,
    });
    return existing ? generateUrlId() : sourceUrlId;
  }

  /**
   * Honors a urlId from a collection export if it does not collide with an
   * existing Collection, otherwise generates a fresh one.
   *
   * @param sourceUrlId The urlId requested by the importer.
   * @param transaction Active sequelize transaction.
   * @returns A urlId to use.
   */
  private async preserveCollectionUrlId(
    sourceUrlId: string,
    transaction: Transaction
  ): Promise<string> {
    const existing = await Collection.unscoped().findOne({
      attributes: ["id"],
      paranoid: false,
      where: { urlId: sourceUrlId },
      transaction,
    });
    return existing ? generateUrlId() : sourceUrlId;
  }

  /**
   * Determine whether this import can be processed by this processor.
   *
   * @param importModel Import model associated with the import.
   * @returns boolean.
   */
  protected abstract canProcess(importModel: Import<T>): boolean;

  /**
   * Phase assigned to the initial ImportTask rows created from
   * `buildTasksInput`. Sources that begin with a bootstrap step (e.g.
   * Markdown zip extraction) override this to return `Bootstrap`. Sources
   * that fan out directly into page work (e.g. Notion) leave the default.
   *
   * @returns Phase for the first wave of ImportTask rows.
   */
  protected getInitialPhase(): ImportTaskPhase {
    return ImportTaskPhase.Page;
  }

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
