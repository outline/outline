import { Integration } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import APIImportTask, {
  ProcessOutput,
} from "@server/queues/tasks/APIImportTask";
import { NotionConverter, NotionPage } from "@server/utils/NotionConverter";
import { ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import { IntegrationService } from "@shared/types";
import { Block, PageType } from "plugins/notion/shared/types";
import { NotionClient } from "../notion";

type ChildPage = { type: PageType; externalId: string };

type ParsePageOutput = ImportTaskOutput[number] & {
  collectionExternalId?: string;
  children: ChildPage[];
};

export default class NotionAPIImportTask extends APIImportTask<IntegrationService.Notion> {
  protected async process(
    importTask: ImportTask<IntegrationService.Notion>
  ): Promise<ProcessOutput<IntegrationService.Notion>> {
    const integration = await Integration.scope("withAuthentication").findByPk(
      importTask.import.integrationId,
      { rejectOnEmpty: true }
    );

    const client = new NotionClient(integration.authentication.token);

    const parsedPages = await Promise.all(
      importTask.input.map(async (item) => this.parseItem({ item, client }))
    );

    const taskOutput: ImportTaskOutput = parsedPages.map((parsedPage) => ({
      externalId: parsedPage.externalId,
      title: parsedPage.title,
      emoji: parsedPage.emoji,
      content: parsedPage.content,
    }));

    const childTasksInput: ImportTaskInput<IntegrationService.Notion> =
      parsedPages.flatMap((parsedPage) =>
        parsedPage.children.map((childPage) => ({
          type: childPage.type,
          externalId: childPage.externalId,
          parentExternalId: parsedPage.externalId,
          collectionExternalId: parsedPage.collectionExternalId,
        }))
      );

    return { taskOutput, childTasksInput };
  }

  protected async scheduleNextTask(
    importTask: ImportTask<IntegrationService.Notion>
  ) {
    await NotionAPIImportTask.schedule({ importTaskId: importTask.id });
    return;
  }

  private async parseItem({
    item,
    client,
  }: {
    item: ImportTaskInput<IntegrationService.Notion>[number];
    client: NotionClient;
  }): Promise<ParsePageOutput> {
    const {
      title: pageTitle,
      emoji: pageEmoji,
      blocks,
    } = await client.fetchPage(item.externalId);

    const doc = NotionConverter.page({ children: blocks } as NotionPage);

    return {
      externalId: item.externalId,
      title: pageTitle,
      emoji: pageEmoji,
      content: doc,
      collectionExternalId: item.collectionExternalId ?? item.externalId,
      children: this.parseChildPages(blocks),
    };

    // const {
    //   title: databaseTitle,
    //   emoji: databaseEmoji,
    //   pages,
    // } = await client.fetchDatabase(item.externalId);
  }

  private parseChildPages(pageBlocks: Block[]): ChildPage[] {
    const childPages: ChildPage[] = [];

    pageBlocks.forEach((block) => {
      if (block.type === "child_page") {
        childPages.push({ type: PageType.Page, externalId: block.id });
      } else if (block.children?.length) {
        childPages.push(...this.parseChildPages(block.children));
      }
    });

    return childPages;
  }
}
