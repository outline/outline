import { createContext } from "@server/context";
import { schema } from "@server/editor";
import { Attachment, Collection, Document, Import } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import { Event, ImportEvent } from "@server/types";
import { ImportInput, ImportTaskInput } from "@shared/schema";
import {
  ImportState,
  ImportTaskState,
  IntegrationService,
  MentionType,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import chunk from "lodash/chunk";
import keyBy from "lodash/keyBy";
import ImportNotionTaskV2 from "plugins/notion/server/tasks/ImportNotionTaskV2";
import { PagePerTask } from "plugins/notion/server/utils";
import { Fragment, Node } from "prosemirror-model";
import { v4 as uuidv4 } from "uuid";
import BaseProcessor from "./BaseProcessor";

export default class ImportsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "imports.create",
    "imports.processed",
  ];

  public async perform(event: ImportEvent) {
    const importModel = await Import.scope("withUser").findByPk(event.modelId, {
      rejectOnEmpty: true,
    });

    switch (event.name) {
      case "imports.create":
        return this.creationFlow(importModel);

      case "imports.processed":
        return this.processedFlow(importModel);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async creationFlow(importModel: Import<any>) {
    if (!importModel.input.length) {
      return;
    }

    if (importModel.service !== IntegrationService.Notion) {
      return;
    }

    const tasksInput: ImportTaskInput<IntegrationService.Notion> = (
      importModel as Import<IntegrationService.Notion>
    ).input.map((item) => ({
      type: item.type,
      externalId: item.externalId,
    }));

    const importTasks = await sequelize.transaction(async (transaction) => {
      const insertedTasks = await Promise.all(
        chunk(tasksInput, PagePerTask).map((input) =>
          ImportTask.create(
            {
              state: ImportTaskState.Created,
              input,
              importId: importModel.id,
            },
            { transaction }
          )
        )
      );

      importModel.state = ImportState.InProgress;
      await importModel.save({ transaction });

      return insertedTasks;
    });

    await ImportNotionTaskV2.schedule({ importTaskId: importTasks[0].id });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processedFlow(importModel: Import<any>) {
    // External id to internal model id.
    const idMap: Record<string, string> = {};
    const now = new Date();

    // These will be imported as collections.
    const importInput = keyBy(importModel.input, "externalId");

    await sequelize.transaction(async (transaction) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ImportTask.findAllInBatches<ImportTask<any>>(
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
}
