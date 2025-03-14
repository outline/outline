import collectionDestroyer from "@server/commands/collectionDestroyer";
import { PagePerImportTask } from "@server/constants";
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
import { ImportInput, ImportTaskInput } from "@shared/schema";
import {
  ImportableIntegrationService,
  ImportState,
  ImportTaskState,
  MentionType,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import chunk from "lodash/chunk";
import keyBy from "lodash/keyBy";
import { Fragment, Node } from "prosemirror-model";
import { CreateOptions, CreationAttributes } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import BaseProcessor from "./BaseProcessor";

export default abstract class ImportsProcessor<
  T extends ImportableIntegrationService
> extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "imports.create",
    "imports.processed",
    "imports.delete",
  ];

  public async perform(event: ImportEvent) {
    const importModel = await Import.scope<Import<T>>("withUser").findByPk<
      Import<T>
    >(event.modelId, {
      rejectOnEmpty: true,
      paranoid: false,
    });

    if (!this.canProcess(importModel)) {
      return;
    }

    switch (event.name) {
      case "imports.create":
        return this.onCreation(importModel);

      case "imports.processed":
        return this.onProcessed(importModel);

      case "imports.delete":
        return this.onDeletion(importModel, event);
    }
  }

  public async onFailed(event: ImportEvent) {
    await sequelize.transaction(async (transaction) => {
      const importModel = await Import.scope("withUser").findByPk(
        event.modelId,
        {
          rejectOnEmpty: true,
        }
      );

      importModel.state = ImportState.Errored;
      await importModel.saveWithCtx(
        createContext({
          user: importModel.createdBy,
          transaction,
        })
      );
    });
  }

  protected abstract canProcess(importModel: Import<T>): boolean;

  private async onCreation(importModel: Import<T>) {
    if (!importModel.input.length) {
      return;
    }

    const tasksInput = this.buildTasksInput(importModel.input);

    const importTasks = await sequelize.transaction(async (transaction) => {
      const insertedTasks = await Promise.all(
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

      return insertedTasks;
    });

    await this.scheduleTask(importTasks[0]);
  }

  protected abstract buildTasksInput(
    importInput: ImportInput<T>
  ): ImportTaskInput<T>;

  protected abstract scheduleTask(importTask: ImportTask<T>): Promise<void>;

  private async onProcessed(importModel: Import<T>) {
    // External id to internal model id.
    const idMap: Record<string, string> = {};
    const now = new Date();

    // These will be imported as collections.
    const importInput = keyBy(importModel.input, "externalId");

    await sequelize.transaction(async (transaction) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ImportTask.findAllInBatches<ImportTask<T>>(
        {
          where: { importId: importModel.id },
          order: [["createdAt", "ASC"]], // ordering ensures collections are created first.
          batchLimit: 5, // output data per task could be huge, so keep a low batch size to prevent OOM.
          transaction,
        },
        async (importTasks) => {
          await Promise.all(
            importTasks.map(async (importTask) => {
              const outputMap = keyBy(importTask.output ?? [], "externalId");

              await Promise.all(
                importTask.input.map(async (input) => {
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

                  const collection = importInput[externalId];

                  const attachments = await Attachment.findAll({
                    attributes: ["id", "size"],
                    where: { documentId: externalId },
                    transaction,
                  });

                  const transformedContent = this.updateMentionsAndAttachments({
                    content: output.content,
                    attachments,
                    importInput,
                    idMap,
                    actorId: importModel.createdById,
                  });

                  if (collection) {
                    await Collection.create(
                      {
                        id: internalId,
                        name: output.title,
                        icon: output.emoji,
                        content: transformedContent,
                        description: DocumentHelper.toMarkdown(
                          transformedContent,
                          {
                            includeTitle: false,
                          }
                        ),
                        createdById: importModel.createdById,
                        teamId: importModel.createdBy.teamId,
                        apiImportId: importModel.id,
                        sort: Collection.DEFAULT_SORT,
                        permission: collection.permission,
                        createdAt: now,
                        updatedAt: now,
                      },
                      { transaction }
                    );

                    // Unset documentId for attachments in collection overview.
                    await Attachment.update(
                      { documentId: null },
                      { where: { documentId: externalId }, transaction }
                    );

                    return;
                  }

                  // Document at the root of a collection when there's no parent (or) the parent is the collection.
                  const isRootDocument =
                    !parentExternalId || !!importInput[parentExternalId];

                  await Document.create(
                    {
                      id: internalId,
                      title: output.title,
                      icon: output.emoji,
                      content: transformedContent,
                      text: DocumentHelper.toMarkdown(transformedContent, {
                        includeTitle: false,
                      }),
                      collectionId: collectionInternalId,
                      parentDocumentId: isRootDocument
                        ? undefined
                        : parentInternalId,
                      createdById: importModel.createdById,
                      lastModifiedById: importModel.createdById,
                      teamId: importModel.createdBy.teamId,
                      apiImportId: importModel.id,
                      createdAt: now,
                      updatedAt: now,
                      publishedAt: now,
                    },
                    { transaction }
                  );

                  // Update document id for attachments in document content.
                  await Attachment.update(
                    { documentId: internalId },
                    { where: { documentId: externalId }, transaction }
                  );
                })
              );
            })
          );
        }
      );

      const createdCollectionIds = importModel.input.map(
        (item) => idMap[item.externalId]
      );

      // Once all collections and documents are created, update collection's document structure.
      // This ensures the root documents have the whole sub tree available in the structure.
      await Document.findAllInBatches<Document>(
        {
          where: { parentDocumentId: null, collectionId: createdCollectionIds },
          include: [
            {
              model: Collection,
              as: "collection",
            },
          ],
          transaction,
        },
        async (documents) => {
          // use "for" loop to sequentially add documents - prevents race condition when same collection structure is updated in multiple promises.
          for (const document of documents) {
            // Without reload, sequelize doesn't have the latest doc structure.
            // TODO: Find an efficient way to do this.
            await document.collection?.reload({ transaction });

            await document.collection?.addDocumentToStructure(document, 0, {
              transaction,
            });
          }
        }
      );

      importModel.state = ImportState.Completed;
      await importModel.saveWithCtx(
        createContext({
          user: importModel.createdBy,
          transaction,
        })
      );
    });
  }

  private updateMentionsAndAttachments({
    content,
    attachments,
    idMap,
    importInput,
    actorId,
  }: {
    content: ProsemirrorDoc;
    idMap: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    importInput: Record<string, ImportInput<any>[number]>;
    attachments: Attachment[];
    actorId: string;
  }) {
    const attachmentsMap = keyBy(attachments, "id");
    const doc = ProsemirrorHelper.toProsemirror(content);

    const transformMentionNode = (node: Node): Node => {
      const json = node.toJSON() as ProsemirrorData;
      const attrs = json.attrs ?? {};

      attrs.id = uuidv4();
      attrs.actorId = actorId;

      const externalId = attrs.modelId as string;
      const internalId = idMap[externalId];

      // In case the linked page is not in the import, don't map the externalId.
      // App will fail the redirect in this case.
      if (internalId) {
        const isCollectionMention = !!importInput[externalId]; // the referenced externalId is a root page.
        attrs.type = isCollectionMention
          ? MentionType.Collection
          : MentionType.Document;
        attrs.modelId = internalId;
      }

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

  private getInternalId(externalId: string, idMap: Record<string, string>) {
    const internalId = idMap[externalId] ?? uuidv4();
    idMap[externalId] = internalId;
    return internalId;
  }

  private async onDeletion(importModel: Import<T>, event: ImportEvent) {
    if (importModel.state !== ImportState.Completed) {
      return;
    }

    await sequelize.transaction(async (transaction) => {
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
    });
  }
}
