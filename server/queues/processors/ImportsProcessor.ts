import fractionalIndex from "fractional-index";
import { chunk, keyBy, truncate } from "es-toolkit/compat";
import { Fragment, Node } from "prosemirror-model";
import type { CreateOptions, CreationAttributes, Transaction } from "sequelize";
import { UniqueConstraintError } from "sequelize";
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
import { colorPalette } from "@shared/utils/collections";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { CollectionValidation } from "@shared/validations";
import { createContext } from "@server/context";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Attachment, Collection, Document, Import, User } from "@server/models";
import type {
  ImportTaskAttributes,
  ImportTaskCreationAttributes,
} from "@server/models/ImportTask";
import ImportTask from "@server/models/ImportTask";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import type { Event, ImportEvent } from "@server/types";
import { generateUrlId } from "@server/utils/url";
import BaseProcessor from "./BaseProcessor";

export const PagePerImportTask = 3;

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
      await collection.destroyWithCtx(
        createContext({ user, ip: event.ip, transaction })
      );
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
    // Cache of resolved external author → internal user id (or undefined when
    // no match). Reused across every output in the import.
    const userIdCache = new Map<string, string | undefined>();
    // These will be imported as collections. Widened to the base input shape
    // because the abstract class has no narrowed view of T.
    const importInput = keyBy(
      importModel.input as BaseImportInput,
      "externalId"
    );
    const ctx = createContext({ user: importModel.createdBy, transaction });

    const firstCollection = await Collection.findFirstCollectionForUser(
      importModel.createdBy,
      {
        attributes: ["index"],
        transaction,
      }
    );

    let collectionIdx = firstCollection?.index ?? null;

    // Pre-pass: allocate new urlIds for every collection and document in this
    // import so internal link hrefs in document content can be rewritten to
    // point at the new paths during persistence. The map is keyed by the old
    // urlId from the export, which is what appears in `/doc/<slug>-<urlId>`
    // and `/collection/<slug>-<urlId>` link hrefs.
    const urlIdMap: Record<string, { urlId: string; title: string }> = {};

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
            const isCollection = !!importInput[output.externalId];
            const allocated = isCollection
              ? await this.preserveCollectionUrlId(output.urlId, transaction)
              : await this.preserveDocumentUrlId(output.urlId, transaction);
            urlIdMap[output.urlId] = {
              urlId: allocated,
              title: output.title,
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
        ], // ordering ensures collections are created first.
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

            const collectionExternalId = input.collectionExternalId;
            const collectionInternalId = collectionExternalId
              ? await this.getInternalId(collectionExternalId, idMap)
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

            const transformedContent = await this.rewriteReferences({
              content: output.content,
              attachments,
              importInput,
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

            if (collectionItem) {
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

              const urlId = output.urlId
                ? urlIdMap[output.urlId]?.urlId
                : undefined;

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
                permission: collectionItem.permission,
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
                { where: { documentId: externalId }, silent: true, transaction }
              );

              continue;
            }

            // Document at the root of a collection when there's no parent (or) the parent is the collection.
            const isRootDocument =
              !parentExternalId || !!importInput[parentExternalId];

            const urlId = output.urlId
              ? urlIdMap[output.urlId]?.urlId
              : undefined;

            const defaults = {
              title: output.title,
              urlId,
              icon: output.icon,
              color: output.color,
              content: transformedContent,
              text: await DocumentHelper.toMarkdown(transformedContent, {
                includeTitle: false,
              }),
              collectionId: collectionInternalId,
              parentDocumentId: isRootDocument ? undefined : parentInternalId,
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
              publishedAt:
                output.publishedAt ??
                output.updatedAt ??
                output.createdAt ??
                now,
            };

            try {
              await Document.findOrCreateWithCtx(
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
   * Rewrite the mentions, attachments, and internal document/collection link
   * marks in a ProseMirrorDoc so they resolve against the imported models
   * rather than the source export.
   *
   * @param content ProseMirrorDoc that represents collection (or) document content.
   * @param attachments Array of attachment models created for the import.
   * @param idMap Map of internalId to externalId.
   * @param urlIdMap Map of old urlId to the newly allocated urlId and title,
   *   used to rewrite `/doc/<slug>-<urlId>` and `/collection/<slug>-<urlId>`
   *   link hrefs.
   * @param importInput Contains the root externalId and associated info which were used to create the import.
   * @param actorId ID of the user who created the import.
   * @returns Updated ProseMirrorDoc.
   */
  private async rewriteReferences({
    content,
    attachments,
    idMap,
    urlIdMap,
    importInput,
    actorId,
    teamId,
  }: {
    content: ProsemirrorDoc;
    attachments: Attachment[];
    idMap: Record<string, string>;
    urlIdMap: Record<string, { urlId: string; title: string }>;
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    importInput: Record<string, ImportInput<any>[number]>;
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

      attrs.size = attachmentsMap[attrs.id as string]?.size;

      json.attrs = attrs;
      return Node.fromJSON(schema, json);
    };

    const rewriteInternalLinkHref = (href: string): string => {
      const docMatch = /^\/doc\/([^/?#]+)(.*)$/.exec(href);
      if (docMatch) {
        const slugMatch = UrlHelper.SLUG_URL_REGEX.exec(docMatch[1]);
        const mapped = slugMatch ? urlIdMap[slugMatch[1]] : undefined;
        if (mapped) {
          return (
            Document.getPath({ title: mapped.title, urlId: mapped.urlId }) +
            docMatch[2]
          );
        }
      }
      const collectionMatch = /^\/collection\/([^/?#]+)(.*)$/.exec(href);
      if (collectionMatch) {
        const slugMatch = UrlHelper.SLUG_URL_REGEX.exec(collectionMatch[1]);
        const mapped = slugMatch ? urlIdMap[slugMatch[1]] : undefined;
        if (mapped) {
          return (
            Collection.getPath({ name: mapped.title, urlId: mapped.urlId }) +
            collectionMatch[2]
          );
        }
      }
      return href;
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

    idMap[externalId] = internalId ?? randomUUID();
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
