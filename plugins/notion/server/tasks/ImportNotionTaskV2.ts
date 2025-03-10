import chunk from "lodash/chunk";
import { Transaction } from "sequelize";
import {
  ImportState,
  ImportTaskInput,
  ImportTaskOutput,
  ImportTaskState,
  ProsemirrorData,
} from "@shared/types";
import { createContext } from "@server/context";
import { Import, Integration } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import BaseTask from "@server/queues/tasks/BaseTask";
import { sequelize } from "@server/storage/database";
import { getPageData } from "../mock-data";
import { NotionBlock, NotionClient } from "../notion";
import { PagePerTask } from "../utils";

type ParsePageOutput = ImportTaskOutput[number] & {
  collectionExternalId?: string;
  childExternalIds: string[];
};

type Props = {
  /** id of the import_task */
  importTaskId: string;
};

export default class ImportNotionTaskV2 extends BaseTask<Props> {
  public async perform({ importTaskId }: Props) {
    const importTask = await ImportTask.scope("withImport").findByPk(
      importTaskId,
      {
        rejectOnEmpty: true,
      }
    );

    switch (importTask.state) {
      case ImportTaskState.Created:
        await importTask.update({ state: ImportTaskState.InProgress });
        return await this.creationFlow(importTask);

      case ImportTaskState.InProgress:
        return this.fetchAndProcess(importTask);

      case ImportTaskState.Completed:
        return await this.completionFlow(importTask);
    }
  }

  private async creationFlow(importTask: ImportTask) {
    await importTask.update({ state: ImportTaskState.InProgress });
    return this.fetchAndProcess(importTask);
  }

  private async completionFlow(importTask: ImportTask) {
    const nextImportTask = await ImportTask.findOne({
      where: {
        state: ImportTaskState.Created,
        importId: importTask.importId,
      },
    });

    if (nextImportTask) {
      await ImportNotionTaskV2.schedule({ importTaskId: nextImportTask.id });
      return;
    }

    await sequelize.transaction(async (transaction) => {
      const associatedImport = await Import.scope("withUser").findByPk(
        importTask.importId,
        {
          rejectOnEmpty: true,
          transaction,
          lock: Transaction.LOCK.UPDATE,
        }
      );

      const ctx = createContext({
        user: associatedImport.createdBy,
        transaction,
      });

      associatedImport.state = ImportState.Processed;
      await associatedImport.saveWithCtx(ctx, undefined, { name: "processed" });
    });
  }

  private async fetchAndProcess(importTask: ImportTask) {
    const integration = await Integration.scope("withAuthentication").findByPk(
      importTask.import.integrationId,
      { rejectOnEmpty: true }
    );

    const client = new NotionClient(integration.authentication.token);

    const parsedPages = await Promise.all(
      importTask.input.map(async (page) => this.parsePage(page, client))
    );

    const taskOutput: ImportTaskOutput = parsedPages.map<
      ImportTaskOutput[number]
    >((parsedPage) => ({
      externalId: parsedPage.externalId,
      title: parsedPage.title,
      emoji: parsedPage.emoji,
      content: parsedPage.content,
    }));

    const childTasksInput: ImportTaskInput = parsedPages.flatMap((parsedPage) =>
      parsedPage.childExternalIds.map<ImportTaskInput[number]>(
        (childExternalId) => ({
          externalId: childExternalId,
          parentExternalId: parsedPage.externalId,
          collectionExternalId: parsedPage.collectionExternalId,
        })
      )
    );

    await sequelize.transaction(async (transaction) => {
      await Promise.all(
        chunk(childTasksInput, PagePerTask).map(async (input) => {
          await ImportTask.create(
            {
              state: ImportTaskState.Created,
              input,
              importId: importTask.importId,
            },
            { transaction }
          );
        })
      );

      importTask.output = taskOutput;
      importTask.state = ImportTaskState.Completed;
      await importTask.save({ transaction });
    });

    await ImportNotionTaskV2.schedule({ importTaskId: importTask.id });
  }

  private async parsePage(
    page: ImportTaskInput[number],
    client: NotionClient
  ): Promise<ParsePageOutput> {
    const { title, emoji, blocks } = await client.fetchPage(page.externalId);
    // TODO: transform blocks to prose mirror content
    const content: ProsemirrorData[] = [
      {
        type: "paragraph",
        content: [
          {
            text: "Anim ut adipisicing duis pariatur consectetur nisi.",
            type: "text",
            content: [],
          },
        ],
      },
    ];

    return {
      externalId: page.externalId,
      title,
      emoji,
      content,
      collectionExternalId: page.collectionExternalId ?? page.externalId,
      childExternalIds: this.getChildPageIds(blocks),
    };
  }

  private getChildPageIds(pageBlocks: NotionBlock[]) {
    const childPageIds: string[] = [];

    pageBlocks.forEach((block) => {
      if (block.type === "child_page") {
        childPageIds.push(block.id);
      } else if (block.children?.length) {
        childPageIds.push(...this.getChildPageIds(block.children));
      }
    });

    return childPageIds;
  }
}
