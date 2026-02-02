import { Sequelize } from "sequelize";
import type { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { Integration } from "@server/models";
import type { UnfurlSignature } from "@server/types";
import env from "./env";
import { getConfluenceConfig } from "./config";

interface ConfluencePage {
  id: string;
  title: string;
  body: {
    storage: {
      value: string;
    };
  };
  space: {
    key: string;
    name: string;
  };
  version: {
    number: number;
  };
  _links: {
    webui: string;
  };
}

export class Confluence {
  /**
   * Parses a Confluence URL and extracts page information
   */
  public static parseUrl(url: string, confluenceUrl?: string) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Support atlassian.net domains and custom Confluence instances
      if (!hostname.includes("atlassian.net") && !confluenceUrl) {
        if (confluenceUrl) {
          const confluenceHost = new URL(confluenceUrl).hostname;
          if (hostname !== confluenceHost) {
            return;
          }
        } else {
          return;
        }
      }

      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      // Confluence page URLs: /pages/viewpage.action?pageId={PAGE_ID}
      // or /spaces/{SPACE_KEY}/pages/{PAGE_ID}/
      const pageIdMatch = urlObj.searchParams.get("pageId");
      if (pageIdMatch) {
        return {
          pageId: pageIdMatch,
          url,
        };
      }

      // Try to extract from path
      const pagesIndex = pathParts.indexOf("pages");
      if (pagesIndex !== -1 && pathParts[pagesIndex + 1]) {
        const pageId = pathParts[pagesIndex + 1];
        return {
          pageId,
          url,
        };
      }

      return;
    } catch (_err) {
      return;
    }
  }

  /**
   * Gets an access token from Confluence using the integration's stored token
   */
  private static async getAccessToken(
    integration: Integration<IntegrationType.Embed>
  ): Promise<string | null> {
    const auth = await integration.$get("authentication");
    if (!auth || !auth.token) {
      return null;
    }

    return auth.token;
  }

  /**
   * Fetches a Confluence page
   */
  private static async fetchPage(
    pageId: string,
    accessToken: string,
    confluenceUrl: string
  ): Promise<ConfluencePage | null> {
    const baseUrl = confluenceUrl || "https://yourcompany.atlassian.net/wiki";

    try {
      const response = await fetch(
        `${baseUrl}/rest/api/content/${pageId}?expand=body.storage,space,version`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Confluence API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Logger.warn("Failed to fetch page from Confluence", error);
      return null;
    }
  }

  /**
   * Converts HTML to plain text (simple version)
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Transforms Confluence page data to Outline format
   */
  private static transformPage(page: ConfluencePage, confluenceUrl: string) {
    const description = page.body?.storage?.value
      ? Confluence.htmlToText(page.body.storage.value).substring(0, 500)
      : "";

    return {
      type: UnfurlResourceType.URL,
      url: `${confluenceUrl}${page._links.webui}`,
      title: page.title,
      description,
      thumbnailUrl: "",
      faviconUrl: "",
    };
  }

  /**
   * Unfurls a Confluence URL
   */
  public static unfurl: UnfurlSignature = async (
    url: string,
    actor?: User
  ) => {
    if (!actor) {
      return;
    }
    const config = await getConfluenceConfig(actor.teamId);
    const confluenceUrl = config.CONFLUENCE_URL;

    if (!confluenceUrl) {
      return;
    }

    const resource = Confluence.parseUrl(url, confluenceUrl);

    if (!resource) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.Confluence,
        teamId: actor.teamId,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const accessToken = await Confluence.getAccessToken(integration);
      if (!accessToken) {
        return { error: "No access token available" };
      }

      const page = await Confluence.fetchPage(
        resource.pageId,
        accessToken,
        confluenceUrl
      );

      if (!page) {
        return { error: "Page not found" };
      }

      return Confluence.transformPage(page, confluenceUrl) as any;
    } catch (err) {
      Logger.warn("Failed to fetch resource from Confluence", err);
      return { error: err instanceof Error ? err.message : "Unknown error" };
    }
  };
}
