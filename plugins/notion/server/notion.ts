import {
  Client,
  isFullPage,
  isFullPageOrDatabase,
  isFullUser,
  iteratePaginatedAPI,
} from "@notionhq/client";
import {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimit } from "async-sema";
import compact from "lodash/compact";
import { Second } from "@shared/utils/time";
import { Block, Page, PageType } from "../shared/types";

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
        pages.push({
          type: item.object === "page" ? PageType.Page : PageType.Database,
          id: item.id,
          name: this.parseTitle(item),
          emoji: this.parseEmoji(item),
        });
      }
    }

    return pages;
  }

  async fetchPage(pageId: string) {
    const { title, emoji, author } = await this.fetchPageInfo(pageId);
    const blocks = await this.fetchBlockChildren(pageId);
    return { title, emoji, author, blocks };
  }

  async fetchDatabase(databaseId: string) {
    const { title, emoji, author } = await this.fetchDatabaseInfo(databaseId);
    const pages = await this.queryDatabase(databaseId);
    return { title, emoji, author, pages };
  }

  private async fetchBlockChildren(blockId: string) {
    const blocks: Block[] = [];

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

  private async queryDatabase(databaseId: string) {
    const pages: Page[] = [];

    let cursor: string | undefined;
    let hasMore = true;
    const queryPromises = [];

    while (hasMore) {
      await this.limiter();

      const response = await this.client.databases.query({
        database_id: databaseId,
        filter_properties: ["title"],
        start_cursor: cursor,
        page_size: this.pageSize,
      });

      const pagesFromRes = compact(
        response.results.map<Page | undefined>((item) => {
          if (!isFullPage(item)) {
            return;
          }

          return {
            type: PageType.Page,
            id: item.id,
            name: this.parseTitle(item),
            emoji: this.parseEmoji(item),
          };
        })
      );

      pages.push(...pagesFromRes);

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;

      queryPromises.push(Promise.resolve()); // Resolved promise when this query completes post rate-limiting.
    }

    await Promise.all(queryPromises);

    return pages;
  }

  private async fetchPageInfo(pageId: string): Promise<{
    title: string;
    emoji?: string;
    author?: string;
  }> {
    await this.limiter();
    const page = (await this.client.pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;

    const author = await this.fetchUsername(page.created_by.id);

    return {
      title: this.parseTitle(page),
      emoji: this.parseEmoji(page),
      author: author ?? undefined,
    };
  }

  private async fetchDatabaseInfo(databaseId: string): Promise<{
    title: string;
    emoji?: string;
    author?: string;
  }> {
    await this.limiter();
    const database = (await this.client.databases.retrieve({
      database_id: databaseId,
    })) as DatabaseObjectResponse;

    const author = await this.fetchUsername(database.created_by.id);

    return {
      title: this.parseTitle(database),
      emoji: this.parseEmoji(database),
      author: author ?? undefined,
    };
  }

  private async fetchUsername(userId: string) {
    await this.limiter();
    const user = await this.client.users.retrieve({ user_id: userId });

    if (user.type === "person") {
      return user.name;
    }

    // bot belongs to a user, get the user's name.
    if (user.bot.owner.type === "user" && isFullUser(user.bot.owner.user)) {
      return user.bot.owner.user.name;
    }

    // bot belongs to a workspace, fallback to bot's name.
    return user.name;
  }

  private parseTitle(item: PageObjectResponse | DatabaseObjectResponse) {
    let richTexts: RichTextItemResponse[];

    if (item.object === "page") {
      const titleProp = Object.values(item.properties).find(
        (property) => property.type === "title"
      );
      richTexts = titleProp?.title ?? [];
    } else {
      richTexts = item.title;
    }

    return richTexts.map((richText) => richText.plain_text).join("");
  }

  private parseEmoji(item: PageObjectResponse | DatabaseObjectResponse) {
    // Other icon types return a url to download from, which we don't support.
    return item.icon?.type === "emoji" ? item.icon.emoji : undefined;
  }
}
