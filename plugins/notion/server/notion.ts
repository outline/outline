import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullPage,
  isFullPageOrDatabase,
  isFullUser,
  RequestTimeoutError,
} from "@notionhq/client";
import type {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimit } from "async-sema";
import emojiRegex from "emoji-regex";
import compact from "lodash/compact";
import truncate from "lodash/truncate";
import { z } from "zod";
import { Second } from "@shared/utils/time";
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
  private retryDelay = 1000;
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

    // oxlint-disable-next-line no-constant-condition
    while (true) {
      try {
        await this.limiter();
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
          if (retries < this.maxRetries) {
            retries++;
            const headers = error.headers as Record<string, string>;
            const retryAfter = headers["Retry-After"]
              ? parseInt(headers["Retry-After"], 10) * 1000 // Convert seconds to milliseconds
              : undefined;
            const delay = retryAfter ?? this.retryDelay * retries;
            Logger.info(
              "task",
              `Notion API rate limit hit, retrying in ${delay}ms (retry ${retries}/${this.maxRetries})`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          Logger.warn(
            `Notion API rate limit exceeded after ${this.maxRetries} retries`,
            { error: error.message }
          );
        }

        // Re-throw the error if it's not a rate limit issue or we've exhausted retries
        throw error;
      }
    }
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
    // When root page IDs are provided via environment variable, fetch them
    // directly instead of scanning the workspace via search. This bypasses
    // the search API entirely, avoiding cursor expiration issues in large
    // workspaces (10k+ pages).
    const rootPageIds = env.NOTION_ROOT_PAGE_IDS;
    if (rootPageIds) {
      const ids = rootPageIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      Logger.info(
        "task",
        `Fetching ${ids.length} root pages by ID (NOTION_ROOT_PAGE_IDS)`
      );

      const pages: Page[] = [];
      for (const id of ids) {
        const page = await this.fetchRootPageById(id);
        if (page) {
          pages.push(page);
        }
      }

      Logger.info(
        "task",
        `Notion fetchRootPages complete: ${pages.length} pages fetched by ID`
      );
      return pages;
    }

    const pages: Page[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let totalScanned = 0;

    while (hasMore) {
      let response;
      try {
        response = await this.fetchWithRetry(() =>
          this.client.search({
            start_cursor: cursor,
            page_size: this.pageSize,
          })
        );
      } catch (error) {
        // Notion search cursors have an undocumented positional limit. For
        // large workspaces (10k+ pages) the cursor expires before pagination
        // completes, causing a validation_error on start_cursor. Rather than
        // returning partial results (which would silently produce an
        // incomplete import), fail with an actionable error message directing
        // the admin to the env var bypass.
        if (
          error instanceof APIResponseError &&
          error.message.includes("start_cursor")
        ) {
          // Log the full remediation instructions (not truncated)
          Logger.info(
            "task",
            `Notion search cursor expired after scanning ${totalScanned} pages. ` +
              `To fix: set NOTION_ROOT_PAGE_IDS env var to a comma-separated list ` +
              `of workspace-level page IDs. To find a page ID, open the page in ` +
              `Notion, click Share > Copy link. The ID is the 32-char hex string ` +
              `before the ?v= parameter in the URL.`
          );
          // GUI error is truncated to 255 chars, so keep it concise
          throw new Error(
            `Notion search cursor expired after scanning ${totalScanned} pages. ` +
              `Workspace too large for search API. Set NOTION_ROOT_PAGE_IDS env ` +
              `var to comma-separated workspace-level page IDs (from Notion ` +
              `Share links) to bypass search.`
          );
        }
        throw error;
      }

      for (const item of response.results) {
        if (!isFullPageOrDatabase(item)) {
          continue;
        }

        totalScanned++;

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
      }

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }

    Logger.info(
      "task",
      `Notion fetchRootPages complete: ${pages.length} workspace-level pages found ` +
        `(${totalScanned} total pages scanned)`
    );

    return pages;
  }

  /**
   * Fetch a single root page or database by ID. Tries pages.retrieve first,
   * falls back to databases.retrieve if the ID refers to a database.
   */
  private async fetchRootPageById(id: string): Promise<Page | undefined> {
    // Try as a page first. If the ID is actually a database, the API returns
    // a validation_error rather than ObjectNotFound, so catch both.
    try {
      const page = (await this.fetchWithRetry(() =>
        this.client.pages.retrieve({ page_id: id })
      )) as PageObjectResponse;

      return {
        type: PageType.Page,
        id: page.id,
        name: this.parseTitle(page, {
          maxLength: CollectionValidation.maxNameLength,
        }),
        emoji: this.parseEmoji(page),
      };
    } catch (error) {
      if (
        error instanceof APIResponseError &&
        (error.code === APIErrorCode.ObjectNotFound ||
          error.code === APIErrorCode.ValidationError)
      ) {
        // Fall through to try as database
      } else {
        throw error;
      }
    }

    // Not a page, try as a database
    try {
      const database = (await this.fetchWithRetry(() =>
        this.client.databases.retrieve({ database_id: id })
      )) as DatabaseObjectResponse;

      return {
        type: PageType.Database,
        id: database.id,
        name: this.parseTitle(database, {
          maxLength: CollectionValidation.maxNameLength,
        }),
        emoji: this.parseEmoji(database),
      };
    } catch (error) {
      if (
        error instanceof APIResponseError &&
        error.code === APIErrorCode.ObjectNotFound
      ) {
        Logger.warn(
          `Notion root page ID ${id} not found as page or database, skipping. ` +
            `Verify the ID is correct and that the page is shared with the integration.`
        );
        return undefined;
      }
      throw error;
    }
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
