import {
  Client,
  isFullPageOrDatabase,
  iteratePaginatedAPI,
} from "@notionhq/client";
import { Page, PageTitle } from "../shared/types";

export class NotionClient {
  private client: Client;
  private pageSize = 25;

  constructor(accessToken: string) {
    this.client = new Client({
      auth: accessToken,
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
          emoji: item.icon?.type === "emoji" ? item.icon.emoji : undefined,
        });
      }
    }

    return pages;
  }
}
