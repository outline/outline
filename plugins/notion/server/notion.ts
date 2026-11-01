import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullPage,
  isFullPageOrDatabase,
  isFullUser,
  RequestTimeoutError,
  UnknownHTTPResponseError,
} from "@notionhq/client";
import type {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimit } from "async-sema";
import emojiRegex from "emoji-regex";
import { compact, truncate } from "es-toolkit/compat";
import { Headers } from "node-fetch";
import { z } from "zod";
import { Minute, Second } from "@shared/utils/time";
import { sleep } from "@shared/utils/timers";
import { isUrl } from "@shared/utils/urls";
import { CollectionValidation, DocumentValidation } from "@shared/validations";
import Logger from "@server/logging/Logger";
import { NotionUtils } from "../shared/NotionUtils";
import type { Block, Page } from "../shared/types";
import { PageType } from "../shared/types";
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
  workspace_icon: z
    .string()
    .nullish()
    .transform((val) => {
      const emojiRegexp = emojiRegex();
      if (val && (isUrl(val) || emojiRegexp.test(val))) {
        return val;
      }
      return undefined;
    }),
});

export class NotionClient {
  private client: Client;
  private limiter: ReturnType<typeof RateLimit>;
  private pageSize = 100;
  private maxRetries = 3;
  private maxRateLimitRetries = 8;
  private maxServerErrorRetries = 8;
  private retryDelay = 1000;
  private maxRateLimitDelay = Minute.ms;
  private pausedUntil = 0;
  private skipChildrenForBlock = [
    "unsupported",
    "child_page",
    "child_database",
  ];

  constructor(
    accessToken: string,
    rateLimit: { window: number; limit: number } = {
      window: Second.ms,
      limit: 3,
    },
    options: { maxRetries?: number; retryDelay?: number } = {}
  ) {
    this.client = new Client({
      auth: accessToken,
    });
    this.limiter = RateLimit(rateLimit.limit, {
      timeUnit: rateLimit.window,
      uniformDistribution: true,
    });
    this.maxRetries = options.maxRetries ?? this.maxRetries;
    this.retryDelay = options.retryDelay ?? this.retryDelay;
  }

  /**
   * Executes an API call with automatic retry on rate limiting errors
   *
   * @param apiCall The async function that makes the Notion API call
   * @returns The result of the API call
   */
  private async fetchWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let retries = 0;
    let rateLimitRetries = 0;
    let serverErrorRetries = 0;

    while (true) {
      try {
        await this.acquire();
        return await apiCall();
      } catch (error) {
        // Check if this is a timeout and try again
        if (error instanceof RequestTimeoutError) {
          if (retries < this.maxRetries) {
            retries++;
            const delay = this.retryDelay * retries;
            Logger.info(
              "task",
              `Notion API timed out, retrying in ${delay}ms (retry ${retries}/${this.maxRetries})`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          Logger.warn(`Notion API timed out after ${this.maxRetries} retries`, {
            error: error.message,
          });
        }

        // Check if this is a rate limit error
        if (
          error instanceof APIResponseError &&
          error.code === APIErrorCode.RateLimited
        ) {
          if (rateLimitRetries < this.maxRateLimitRetries) {
            rateLimitRetries++;
            const delay = Math.min(
              this.getRetryAfter(error) ??
                this.retryDelay * 2 ** (rateLimitRetries - 1),
              this.maxRateLimitDelay
            );
            Logger.info(
              "task",
              `Notion API rate limit hit, retrying in ${delay}ms (retry ${rateLimitRetries}/${this.maxRateLimitRetries})`
            );

            // Pause all requests from this client, not only this one.
            this.pausedUntil = Math.max(this.pausedUntil, Date.now() + delay);
            continue;
          }

          Logger.warn(
            `Notion API rate limit exceeded after ${this.maxRateLimitRetries} retries`,
            { error: error.message }
          );
        }

        // Check if this is a server-side error (5xx) — Notion's API can be
        // unreliable, so retry these for longer with exponential backoff.
        if (
          (error instanceof APIResponseError ||
            error instanceof UnknownHTTPResponseError) &&
          error.status >= 500
        ) {
          if (serverErrorRetries < this.maxServerErrorRetries) {
            serverErrorRetries++;
            const delay = this.retryDelay * 2 ** (serverErrorRetries - 1);
            Logger.info(
              "task",
              `Notion API returned ${error.status}, retrying in ${delay}ms (retry ${serverErrorRetries}/${this.maxServerErrorRetries})`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          Logger.warn(
            `Notion API returned ${error.status} after ${this.maxServerErrorRetries} retries`,
            { error: error.message }
          );
        }

        // Re-throw the error if it's not a rate limit issue or we've exhausted retries
        throw error;
      }
    }
  }

  /**
   * Waits for a slot from the rate limiter and for any rate limit pause to end.
   *
   * @returns a promise that resolves when a request can be sent.
   */
  private async acquire() {
    while (true) {
      if (Date.now() < this.pausedUntil) {
        await sleep(this.pausedUntil - Date.now());
      }
      await this.limiter();

      // A pause can start while this request waits in the limiter queue.
      if (Date.now() >= this.pausedUntil) {
        return;
      }
    }
  }

  /**
   * Reads the Retry-After header from a rate limit error.
   *
   * @param error the error returned by the Notion API.
   * @returns the delay in milliseconds, or undefined if the header is missing.
   */
  private getRetryAfter(error: APIResponseError) {
    if (!(error.headers instanceof Headers)) {
      return undefined;
    }
    const seconds = parseInt(error.headers.get("retry-after") ?? "", 10);
    return Number.isFinite(seconds) ? seconds * Second.ms : undefined;
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
      const response = await this.fetchWithRetry(() =>
        this.client.search({
          start_cursor: cursor,
          page_size: this.pageSize,
        })
      );

      response.results.forEach((item) => {
        if (!isFullPageOrDatabase(item)) {
          return;
        }

        if (item.parent.type === "workspace") {
          pages.push({
            type: item.object === "page" ? PageType.Page : PageType.Database,
            id: item.id,
            name: this.parseTitle(item, {
              maxLength: CollectionValidation.maxNameLength,
            }),
            emoji: this.parseEmoji(item),
          });
        }
      });

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }

    return pages;
  }

  async fetchPage(
    pageId: string,
    { titleMaxLength }: { titleMaxLength: number }
  ) {
    const pageInfo = await this.fetchPageInfo(pageId, { titleMaxLength });
    const blocks = await this.fetchBlockChildren(pageId);
    return { ...pageInfo, blocks };
  }

  async fetchDatabase(
    databaseId: string,
    { titleMaxLength }: { titleMaxLength: number }
  ) {
    const databaseInfo = await this.fetchDatabaseInfo(databaseId, {
      titleMaxLength,
    });
    const pages = await this.queryDatabase(databaseId);
    return { ...databaseInfo, pages };
  }

  private async fetchBlockChildren(blockId: string) {
    const blocks: Block[] = [];

    let cursor: string | undefined;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.fetchWithRetry(() =>
          this.client.blocks.children.list({
            block_id: blockId,
            start_cursor: cursor,
            page_size: this.pageSize,
          })
        );

        blocks.push(...(response.results as BlockObjectResponse[]));

        hasMore = response.has_more;
        cursor = response.next_cursor ?? undefined;
      }

      await Promise.all(
        blocks.map(async (block) => {
          if (
            block.has_children &&
            !this.skipChildrenForBlock.includes(block.type)
          ) {
            block.children = await this.fetchBlockChildren(block.id);
          }
        })
      );
    } catch (error) {
      if (
        error instanceof APIResponseError &&
        (error.code === APIErrorCode.ObjectNotFound ||
          error.code === APIErrorCode.Unauthorized)
      ) {
        Logger.warn(
          `Skipping Notion block children for ${blockId} - Error code: ${error.code}`
        );
        return [];
      }
      throw error;
    }

    return blocks;
  }

  private async queryDatabase(databaseId: string) {
    const pages: Page[] = [];

    let cursor: string | undefined;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.fetchWithRetry(() =>
          this.client.databases.query({
            database_id: databaseId,
            filter_properties: ["title"],
            start_cursor: cursor,
            page_size: this.pageSize,
          })
        );

        const pagesFromRes = compact(
          response.results.map<Page | undefined>((item) => {
            if (!isFullPage(item)) {
              return;
            }

            return {
              type: PageType.Page,
              id: item.id,
              name: this.parseTitle(item, {
                maxLength: DocumentValidation.maxTitleLength,
              }),
              emoji: this.parseEmoji(item),
            };
          })
        );

        pages.push(...pagesFromRes);

        hasMore = response.has_more;
        cursor = response.next_cursor ?? undefined;
      }
    } catch (error) {
      if (
        error instanceof APIResponseError &&
        (error.code === APIErrorCode.ObjectNotFound ||
          error.code === APIErrorCode.Unauthorized)
      ) {
        Logger.warn(
          `Skipping Notion database query for ${databaseId} - Error code: ${error.code}`
        );
        return [];
      }
      throw error;
    }

    return pages;
  }

  private async fetchPageInfo(
    pageId: string,
    { titleMaxLength }: { titleMaxLength: number }
  ): Promise<PageInfo> {
    const page = (await this.fetchWithRetry(() =>
      this.client.pages.retrieve({
        page_id: pageId,
      })
    )) as PageObjectResponse;

    const author = await this.fetchUsername(page.created_by.id);

    return {
      title: this.parseTitle(page, {
        maxLength: titleMaxLength,
      }),
      emoji: this.parseEmoji(page),
      author: author ?? undefined,
      createdAt: !page.created_time ? undefined : new Date(page.created_time),
      updatedAt: !page.last_edited_time
        ? undefined
        : new Date(page.last_edited_time),
    };
  }

  private async fetchDatabaseInfo(
    databaseId: string,
    { titleMaxLength }: { titleMaxLength: number }
  ): Promise<PageInfo> {
    const database = (await this.fetchWithRetry(() =>
      this.client.databases.retrieve({
        database_id: databaseId,
      })
    )) as DatabaseObjectResponse;

    const author = await this.fetchUsername(database.created_by.id);

    return {
      title: this.parseTitle(database, {
        maxLength: titleMaxLength,
      }),
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
    try {
      const user = await this.fetchWithRetry(() =>
        this.client.users.retrieve({ user_id: userId })
      );

      if (user.type === "person" || !user.bot.owner) {
        return user.name;
      }

      // bot belongs to a user, get the user's name
      if (user.bot.owner.type === "user" && isFullUser(user.bot.owner.user)) {
        return user.bot.owner.user.name;
      }

      // bot belongs to a workspace, fallback to bot's name
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

  private parseTitle(
    item: PageObjectResponse | DatabaseObjectResponse,
    {
      maxLength = DocumentValidation.maxTitleLength,
    }: { maxLength?: number } = {}
  ) {
    let richTexts: RichTextItemResponse[];

    if (item.object === "page") {
      const titleProp = Object.values(item.properties).find(
        (property) => property.type === "title"
      );
      richTexts = titleProp?.title ?? [];
    } else {
      richTexts = item.title;
    }

    const title = richTexts.map((richText) => richText.plain_text).join("");

    // Truncate title to fit within validation limits
    return truncate(title, { length: maxLength });
  }

  private parseEmoji(item: PageObjectResponse | DatabaseObjectResponse) {
    // Other icon types return a url to download from, which we don't support.
    return item.icon?.type === "emoji" ? item.icon.emoji : undefined;
  }
}
