import { Sequelize } from "sequelize";
import type { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { Integration } from "@server/models";
import type { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  shortUrl: string;
  closed: boolean;
  due: string | null;
  dueComplete: boolean;
  idList: string;
  idBoard: string;
  board: {
    name: string;
    url: string;
  };
  list: {
    name: string;
  };
  members: Array<{
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string;
  }>;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  dateLastActivity: string;
}

export class Trello {
  private static supportedResources = [UnfurlResourceType.Issue];

  /**
   * Parses a Trello URL and extracts card information
   */
  public static parseUrl(url: string) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      if (hostname !== "trello.com" && hostname !== "www.trello.com") {
        return;
      }

      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      // Trello card URLs: /c/{CARD_SHORT_ID}/{CARD_NAME} or /b/{BOARD_ID}/{BOARD_NAME}/c/{CARD_SHORT_ID}/{CARD_NAME}
      const cardIndex = pathParts.indexOf("c");
      if (cardIndex === -1 || !pathParts[cardIndex + 1]) {
        return;
      }

      const cardShortId = pathParts[cardIndex + 1];

      return {
        cardShortId,
        url,
      };
    } catch (_err) {
      return;
    }
  }

  /**
   * Gets an access token from Trello using the integration's stored token
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
   * Fetches a Trello card
   */
  private static async fetchCard(
    cardShortId: string,
    accessToken: string
  ): Promise<TrelloCard | null> {
    try {
      const response = await fetch(
        `https://api.trello.com/1/cards/${cardShortId}?token=${accessToken}&key=${process.env.TRELLO_API_KEY}&fields=name,desc,url,shortUrl,closed,due,dueComplete,idList,idBoard,dateLastActivity&board=name,url&list=name&members=fullName,username,avatarUrl&labels=name,color`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Trello API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Logger.warn("Failed to fetch card from Trello", error);
      return null;
    }
  }

  /**
   * Transforms Trello card data to Outline format
   */
  private static transformCard(card: TrelloCard): UnfurlIssueOrPR {
    const state = card.closed ? "closed" : "open";
    return {
      type: UnfurlResourceType.Issue,
      url: card.url,
      id: card.shortUrl,
      title: card.name,
      description: card.desc || null,
      author: {
        name: card.members[0]?.fullName || card.members[0]?.username || "",
        avatarUrl: card.members[0]?.avatarUrl || "",
      },
      labels: card.labels.map((label) => ({
        name: label.name,
        color: Trello.getColorForLabel(label.color),
      })),
      state: {
        name: state,
        color: Trello.getColorForStatus(state),
      },
      createdAt: card.dateLastActivity,
    };
  }

  /**
   * Gets color for label
   */
  private static getColorForLabel(color: string): string {
    const colorMap: Record<string, string> = {
      green: "#10B981",
      yellow: "#F59E0B",
      orange: "#F97316",
      red: "#EF4444",
      purple: "#8B5CF6",
      blue: "#3B82F6",
      sky: "#0EA5E9",
      lime: "#84CC16",
      pink: "#EC4899",
      black: "#1F2937",
    };

    return colorMap[color.toLowerCase()] || "#6B7280";
  }

  /**
   * Gets color for card status
   */
  private static getColorForStatus(status: string): string {
    switch (status.toLowerCase()) {
      case "open":
        return "#10B981"; // Green
      case "closed":
        return "#6B7280"; // Gray
      default:
        return "#3B82F6"; // Blue
    }
  }

  /**
   * Unfurls a Trello URL
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = Trello.parseUrl(url);

    if (!resource) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.Trello,
        teamId: actor.teamId,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const accessToken = await Trello.getAccessToken(integration);
      if (!accessToken) {
        return { error: "No access token available" };
      }

      const card = await Trello.fetchCard(resource.cardShortId, accessToken);

      if (!card) {
        return { error: "Card not found" };
      }

      return Trello.transformCard(card);
    } catch (err) {
      Logger.warn("Failed to fetch resource from Trello", err);
      return { error: err instanceof Error ? err.message : "Unknown error" };
    }
  };
}
