import chunk from "lodash/chunk";
import {
  ImportTaskInput,
  ImportTaskOutput,
  ImportTaskState,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import { Integration } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import BaseTask from "@server/queues/tasks/BaseTask";
import { sequelize } from "@server/storage/database";
import { NotionBlock, NotionClient } from "../notion";
import { PagePerTask } from "../utils";
import { getPageData } from "./mock-data";

type ParsePageOutput = {
  externalId: string;
  childExternalIds: string[];
  content: ProsemirrorData[];
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

    const integration = await Integration.scope("withAuthentication").findByPk(
      importTask.import.integrationId,
      { rejectOnEmpty: true }
    );

    const client = new NotionClient(integration.authentication.token);
    const pages: Record<string, ProsemirrorDoc> = {};

    const parsedPages = await Promise.all(
      importTask.input.map(async (page) =>
        this.parsePage(page.externalId, client)
      )
    );

    const taskOutput: ImportTaskOutput = parsedPages.map<
      ImportTaskOutput[number]
    >((parsedPage) => ({
      externalId: parsedPage.externalId,
      content: parsedPage.content,
    }));

    const childTasksInput: ImportTaskInput = parsedPages.flatMap((parsedPage) =>
      parsedPage.childExternalIds.map<ImportTaskInput[number]>(
        (childExternalId) => ({
          externalId: childExternalId,
          parentExternalId: parsedPage.externalId,
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
      await importTask.save();
    });
  }

  private async parsePage(
    pageId: string,
    client: NotionClient
  ): Promise<ParsePageOutput> {
    const pageBlocks = await client.fetchPage(pageId);
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
      externalId: pageId,
      childExternalIds: this.getChildPageIds(pageBlocks),
      content,
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
