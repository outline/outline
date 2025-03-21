import { ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import { IntegrationService, ProsemirrorDoc } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { Integration } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import APIImportTask, {
  ProcessOutput,
} from "@server/queues/tasks/APIImportTask";
import { Block, PageType } from "../../shared/types";
import { NotionClient } from "../notion";
import { NotionConverter, NotionPage } from "../utils/NotionConverter";

type ChildPage = { type: PageType; externalId: string };

type ParsePageOutput = ImportTaskOutput[number] & {
  collectionExternalId?: string;
  children: ChildPage[];
};

export default class NotionAPIImportTask extends APIImportTask<IntegrationService.Notion> {
  /**
   * Process the Notion import task.
   * This fetches data from Notion and converts it to task output.
   *
   * @param importTask ImportTask model to process.
   * @returns Promise with output that resolves once processing has completed.
   */
  protected async process(
    importTask: ImportTask<IntegrationService.Notion>
  ): Promise<ProcessOutput<IntegrationService.Notion>> {
    const integration = await Integration.scope("withAuthentication").findByPk(
      importTask.import.integrationId,
      { rejectOnEmpty: true }
    );

    const client = new NotionClient(integration.authentication.token);

    const parsedPages = await Promise.all(
      importTask.input.map(async (item) => this.processPage({ item, client }))
    );

    const taskOutput: ImportTaskOutput = parsedPages.map((parsedPage) => ({
      externalId: parsedPage.externalId,
      title: parsedPage.title,
      emoji: parsedPage.emoji,
      content: parsedPage.content,
      author: parsedPage.author,
      createdAt: parsedPage.createdAt,
      updatedAt: parsedPage.updatedAt,
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

  /**
   * Schedule the next `NotionAPIImportTask`.
   *
   * @param importTask ImportTask model associated with the `NotionAPIImportTask`.
   * @returns Promise that resolves when the task is scheduled.
   */
  protected async scheduleNextTask(
    importTask: ImportTask<IntegrationService.Notion>
  ) {
    await NotionAPIImportTask.schedule({ importTaskId: importTask.id });
    return;
  }

  /**
   * Fetch page data from Notion and convert it to expected output.
   *
   * @param item Object containing data about a notion page (or) database.
   * @param client Notion client.
   * @returns Promise of parsed page output that resolves when the task is scheduled.
   */
  private async processPage({
    item,
    client,
  }: {
    item: ImportTaskInput<IntegrationService.Notion>[number];
    client: NotionClient;
  }): Promise<ParsePageOutput> {
    const collectionExternalId = item.collectionExternalId ?? item.externalId;

    // Convert Notion database to an empty page with "pages in database" as its children.
    if (item.type === PageType.Database) {
      const { pages, ...databaseInfo } = await client.fetchDatabase(
        item.externalId
      );

      return {
        ...databaseInfo,
        externalId: item.externalId,
        content: ProsemirrorHelper.getEmptyDocument() as ProsemirrorDoc,
        collectionExternalId,
        children: pages.map((page) => ({
          type: page.type,
          externalId: page.id,
        })),
      };
    }

    const { blocks, ...pageInfo } = await client.fetchPage(item.externalId);

    return {
      ...pageInfo,
      externalId: item.externalId,
      content: NotionConverter.page({ children: blocks } as NotionPage),
      collectionExternalId,
      children: this.parseChildPages(blocks),
    };
  }

  /**
   * Parse Notion page blocks to get its child pages and databases.
   *
   * @param pageBlocks Array of blocks representing the page's content.
   * @returns Array containing child page and child database info.
   */
  private parseChildPages(pageBlocks: Block[]): ChildPage[] {
    const childPages: ChildPage[] = [];

    pageBlocks.forEach((block) => {
      if (block.type === "child_page") {
        childPages.push({ type: PageType.Page, externalId: block.id });
      } else if (block.type === "child_database") {
        childPages.push({ type: PageType.Database, externalId: block.id });
      } else if (block.children?.length) {
        childPages.push(...this.parseChildPages(block.children));
      }
    });

    return childPages;
  }
}
