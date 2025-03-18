import fractionalIndex from "fractional-index";
import chunk from "lodash/chunk";
import keyBy from "lodash/keyBy";
import truncate from "lodash/truncate";
import { Fragment, Node } from "prosemirror-model";
import { CreateOptions, CreationAttributes, Transaction } from "sequelize";
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

  public async perform(event: ImportEvent) {
    await sequelize.transaction(async (transaction) => {
      const importModel = await Import.findByPk<Import<T>>(event.modelId, {
        rejectOnEmpty: true,
        paranoid: false,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (
        !this.canProcess(importModel) ||
        importModel.state === ImportState.Errored
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

  private async onCreation(importModel: Import<T>, transaction: Transaction) {
    if (!importModel.input.length) {
      return;
    }

    const tasksInput = this.buildTasksInput(importModel.input);

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

    transaction.afterCommit(() => this.scheduleTask(importTasks[0]));
  }

  private async onProcessed(importModel: Import<T>, transaction: Transaction) {
    const { collectionIds } = await this.createCollectionsAndDocuments({
      importModel,
      transaction,
    });

    // Once all collections and documents are created, update collection's document structure.
    // This ensures the root documents have the whole subtree available in the structure.
    await Document.findAllInBatches<Document>(
      {
        where: { parentDocumentId: null, collectionId: collectionIds },
        include: [
          {
            model: Collection,
            as: "collection",
          },
        ],
        order: [["createdAt", "DESC"]],
        transaction,
      },
      async (documents) => {
        for (const document of documents) {
          // Without reload, sequelize overwrites the updates to collection.
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
  }

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

  private async createCollectionsAndDocuments({
    importModel,
    transaction,
  }: {
    importModel: Import<T>;
    transaction: Transaction;
  }): Promise<{ collectionIds: string[] }> {
    const now = new Date();
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

              await Collection.createWithCtx(
                ctx,
                {
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
                  createdAt: now,
                  updatedAt: now,
                },
                { data: { name: output.title, source: "import" } }
              );

              // Unset documentId for attachments in collection overview.
              await Attachment.update(
                { documentId: null },
                { where: { documentId: externalId }, transaction }
              );

              continue;
            }

            // Document at the root of a collection when there's no parent (or) the parent is the collection.
            const isRootDocument =
              !parentExternalId || !!importInput[parentExternalId];

            await Document.createWithCtx(
              ctx,
              {
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
                createdAt: now,
                updatedAt: now,
                publishedAt: now,
              },
              { data: { title: output.title, source: "import" } }
            );

            // Update document id for attachments in document content.
            await Attachment.update(
              { documentId: internalId },
              { where: { documentId: externalId }, transaction }
            );
          }
        }
      }
    );

    return {
      collectionIds: importModel.input.map((item) => idMap[item.externalId]),
    };
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
  }): ProsemirrorDoc {
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

  private getInternalId(externalId: string, idMap: Record<string, string>) {
    const internalId = idMap[externalId] ?? uuidv4();
    idMap[externalId] = internalId;
    return internalId;
  }

  protected abstract canProcess(importModel: Import<T>): boolean;

  protected abstract buildTasksInput(
    importInput: ImportInput<T>
  ): ImportTaskInput<T>;

  protected abstract scheduleTask(importTask: ImportTask<T>): Promise<void>;
}
