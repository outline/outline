import { Collection, Document, Import } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import { sequelize } from "@server/storage/database";
import { Event, ImportEvent } from "@server/types";
import {
  ImportInput,
  ImportState,
  ImportTaskInput,
  ImportTaskOutput,
  ImportTaskState,
} from "@shared/types";
import chunk from "lodash/chunk";
import keyBy from "lodash/keyBy";
import ImportNotionTaskV2 from "plugins/notion/server/tasks/ImportNotionTaskV2";
import { PagePerTask } from "plugins/notion/server/utils";
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

  private async creationFlow(importModel: Import) {
    if (!importModel.input.length) {
      return;
    }

    const tasksInput: ImportTaskInput = importModel.input.map<
      ImportTaskInput[number]
    >((item) => ({
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

  private async processedFlow(importModel: Import) {
    // External id to internal model id mapper.
    const idMapper: Record<string, string> = {};
    const now = new Date();

    // These will be imported as collections.
    const importInput = keyBy<ImportInput[number]>(
      importModel.input,
      (item) => item.externalId
    );

    await sequelize.transaction(async (transaction) => {
      await ImportTask.findAllInBatches<ImportTask>(
        {
          where: { importId: importModel.id },
          order: [["createdAt", "ASC"]], // ordering ensures collections are created first.
          batchLimit: 5,
          transaction,
        },
        async (importTasks) => {
          await Promise.all(
            importTasks.map(async (importTask) => {
              const outputMap = keyBy<ImportTaskOutput[number]>(
                importTask.output ?? [],
                (item) => item.externalId
              );

              await Promise.all(
                importTask.input.map(async (input) => {
                  const externalId = input.externalId;
                  const internalId = this.getInternalId(externalId, idMapper);

                  const parentExternalId = input.parentExternalId;
                  const parentInternalId = parentExternalId
                    ? this.getInternalId(parentExternalId, idMapper)
                    : undefined;

                  const collectionExternalId = input.collectionExternalId;
                  const collectionInternalId = collectionExternalId
                    ? this.getInternalId(collectionExternalId, idMapper)
                    : undefined;

                  const output = outputMap[externalId];

                  const collection = importInput[externalId];

                  if (collection) {
                    await Collection.create(
                      {
                        id: internalId,
                        name: output.title,
                        icon: output.emoji,
                        content: {
                          type: "doc",
                          content: output.content,
                        },
                        createdById: importModel.createdById,
                        teamId: importModel.createdBy.teamId,
                        sort: Collection.DEFAULT_SORT,
                        permission: collection.permission,
                        createdAt: now,
                        updatedAt: now,
                      },
                      { transaction }
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
                      content: {
                        type: "doc",
                        content: output.content,
                      },
                      text: "",
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
                })
              );
            })
          );
        }
      );

      const createdCollectionIds = importModel.input.map(
        (item) => idMapper[item.externalId]
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
      await importModel.save({ transaction });
    });
  }

  private getInternalId(externalId: string, mapper: Record<string, string>) {
    const internalId = mapper[externalId] ?? uuidv4();
    mapper[externalId] = internalId;
    return internalId;
  }
}
