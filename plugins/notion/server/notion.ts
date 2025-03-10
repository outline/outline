import {
  Client,
  isFullPageOrDatabase,
  iteratePaginatedAPI,
} from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimit } from "async-sema";
import { Second } from "@shared/utils/time";
import { Page, PageTitle } from "../shared/types";

// Transformed block structure with "children".
export type NotionBlock = BlockObjectResponse & {
  children?: NotionBlock[];
};

export class NotionClient {
  private client: Client;
  private limiter: ReturnType<typeof RateLimit>;
  private pageSize = 25;

  constructor(
    accessToken: string,
    rateLimit: { window: number; limit: number } = {
      window: Second.ms,
      limit: 3,
    }
  ) {
    this.client = new Client({
      auth: accessToken,
    });
    this.limiter = RateLimit(rateLimit.limit, {
      timeUnit: rateLimit.window,
      uniformDistribution: true,
    });
  }

  async fetchRootPages() {
    const pages: Page[] = [];

    for await (const item of iteratePaginatedAPI(this.client.search, {
      page_size: this.pageSize,
    })) {
      if (!isFullPageOrDatabase(item)) {
        continue;
      }

      if (item.parent.type === "workspace") {
        let titleProp;

        if (item.object === "page") {
          titleProp = (item.properties["title"] as PageTitle).title;
        } else {
          titleProp = item.title;
        }

        pages.push({
          id: item.id,
          name: titleProp.at(0)?.plain_text ?? "",
          emoji: item.icon?.type === "emoji" ? item.icon.emoji : undefined, // Other icon types return a url to download from, which we don't support.
        });
      }
    }

    return pages;
  }

  async fetchPage(pageId: string) {
    const blocks = await this.fetchBlockChildren(pageId);
    const { title, emoji } = await this.fetchPageInfo(pageId);
    return { title, emoji, blocks };
  }

  private async fetchBlockChildren(blockId: string) {
    const blocks: NotionBlock[] = [];

    let cursor: string | undefined;
    let hasMore = true;
    const childrenPromises = [];

    while (hasMore) {
      await this.limiter();

      const response = await this.client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: this.pageSize,
      });

      blocks.push(...(response.results as BlockObjectResponse[]));

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;

      childrenPromises.push(Promise.resolve()); // Resolved promise when this page completes post rate-limiting.
    }

    // Wait for all direct children to complete fetching.
    await Promise.all(childrenPromises);

    // Recursive fetch when direct children have their own children.
    await Promise.all(
      blocks.map(async (block) => {
        if (
          block.has_children &&
          block.type !== "child_page" &&
          block.type !== "child_database"
        ) {
          block.children = await this.fetchBlockChildren(block.id);
        }
      })
    );

    return blocks;
  }

  private async fetchPageInfo(pageId: string): Promise<{
    title: string;
    emoji?: string;
  }> {
    await this.limiter();
    const page = (await this.client.pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;

    const titleProp = (page.properties["title"] as PageTitle).title;

    return {
      title: titleProp.at(0)?.plain_text ?? "",
      emoji: page.icon?.type === "emoji" ? page.icon.emoji : undefined, // Other icon types return a url to download from, which we don't support.
    };
  }
}
