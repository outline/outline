import { ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import { IntegrationService, ProsemirrorDoc } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { Integration } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import APIImportTask, {
  ProcessOutput,
} from "@server/queues/tasks/APIImportTask";
import { NotionConverter, NotionPage } from "@server/utils/NotionConverter";
import { NotionClient } from "../notion";
import { Block, PageType } from "plugins/notion/shared/types";

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
      author: parsedPage.author,
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
    const collectionExternalId = item.collectionExternalId ?? item.externalId;

    // Convert Notion database to an empty page with "pages in database" as its children.
    if (item.type === PageType.Database) {
      const {
        title: databaseTitle,
        emoji: databaseEmoji,
        author: databaseAuthor,
        pages,
      } = await client.fetchDatabase(item.externalId);

      return {
        externalId: item.externalId,
        title: databaseTitle,
        emoji: databaseEmoji,
        author: databaseAuthor,
        content: ProsemirrorHelper.getEmptyDocument() as ProsemirrorDoc,
        collectionExternalId,
        children: pages.map((page) => ({
          type: page.type,
          externalId: page.id,
        })),
      };
    }

    const {
      title: pageTitle,
      emoji: pageEmoji,
      author: pageAuthor,
      blocks,
    } = await client.fetchPage(item.externalId);

    return {
      externalId: item.externalId,
      title: pageTitle,
      emoji: pageEmoji,
      author: pageAuthor,
      content: NotionConverter.page({ children: blocks } as NotionPage),
      collectionExternalId,
      children: this.parseChildPages(blocks),
    };
  }

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
