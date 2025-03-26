import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullPage,
  isFullPageOrDatabase,
  isFullUser,
} from "@notionhq/client";
import {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimit } from "async-sema";
import compact from "lodash/compact";
import { z } from "zod";
import { Second } from "@shared/utils/time";
import { NotionUtils } from "../shared/NotionUtils";
import { Block, Page, PageType } from "../shared/types";
import env from "./env";

type PageInfo = {
  title: string;
  emoji?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const Credentials = Buffer.from(
  `${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`
).toString("base64");

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  bot_id: z.string(),
  workspace_id: z.string(),
  workspace_name: z.string().nullish(),
  workspace_icon: z.string().url().nullish(),
});

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

  static async oauthAccess(code: string) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Credentials}`,
    };
    const body = {
      grant_type: "authorization_code",
      code,
      redirect_uri: NotionUtils.callbackUrl(),
    };

    const res = await fetch(NotionUtils.tokenUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return AccessTokenResponseSchema.parse(await res.json());
  }

  async fetchRootPages() {
    const pages: Page[] = [];

    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      await this.limiter();

      const response = await this.client.search({
        start_cursor: cursor,
        page_size: this.pageSize,
      });

      response.results.forEach((item) => {
        if (!isFullPageOrDatabase(item)) {
          return;
        }

        if (item.parent.type === "workspace") {
          pages.push({
            type: item.object === "page" ? PageType.Page : PageType.Database,
            id: item.id,
            name: this.parseTitle(item),
            emoji: this.parseEmoji(item),
          });
        }
      });

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }

    return pages;
  }

  async fetchPage(pageId: string) {
    const pageInfo = await this.fetchPageInfo(pageId);
    const blocks = await this.fetchBlockChildren(pageId);
    return { ...pageInfo, blocks };
  }

  async fetchDatabase(databaseId: string) {
    const databaseInfo = await this.fetchDatabaseInfo(databaseId);
    const pages = await this.queryDatabase(databaseId);
    return { ...databaseInfo, pages };
  }

  private async fetchBlockChildren(blockId: string) {
    const blocks: Block[] = [];

    let cursor: string | undefined;
    let hasMore = true;

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
    }

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
    }

    return pages;
  }

  private async fetchPageInfo(pageId: string): Promise<PageInfo> {
    await this.limiter();
    const page = (await this.client.pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;

    const author = await this.fetchUsername(page.created_by.id);

    return {
      title: this.parseTitle(page),
      emoji: this.parseEmoji(page),
      author: author ?? undefined,
      createdAt: !page.created_time ? undefined : new Date(page.created_time),
      updatedAt: !page.last_edited_time
        ? undefined
        : new Date(page.last_edited_time),
    };
  }

  private async fetchDatabaseInfo(databaseId: string): Promise<PageInfo> {
    await this.limiter();
    const database = (await this.client.databases.retrieve({
      database_id: databaseId,
    })) as DatabaseObjectResponse;

    const author = await this.fetchUsername(database.created_by.id);

    return {
      title: this.parseTitle(database),
      emoji: this.parseEmoji(database),
      author: author ?? undefined,
      createdAt: !database.created_time
        ? undefined
        : new Date(database.created_time),
      updatedAt: !database.last_edited_time
        ? undefined
        : new Date(database.last_edited_time),
    };
  }

  private async fetchUsername(userId: string) {
    await this.limiter();
    try {
      const user = await this.client.users.retrieve({ user_id: userId });

      if (user.type === "person" || !user.bot.owner) {
        return user.name;
      }

      // bot belongs to a user, get the user's name.
      if (user.bot.owner.type === "user" && isFullUser(user.bot.owner.user)) {
        return user.bot.owner.user.name;
      }

      // bot belongs to a workspace, fallback to bot's name.
      return user.name;
    } catch (error) {
      // Handle the case where a user can't be found
      if (
        error instanceof APIResponseError &&
        error.code === APIErrorCode.ObjectNotFound
      ) {
        return "Unknown";
      }
      throw error;
    }
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
