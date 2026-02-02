import { Sequelize } from "sequelize";
import type { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { Integration } from "@server/models";
import type { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import env from "./env";

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string | null;
    status: {
      name: string;
      statusCategory: {
        colorName: string;
      };
    };
    creator: {
      displayName: string;
      avatarUrls: {
        "48x48": string;
      };
    };
    created: string;
    updated: string;
  };
  self: string;
}

export class Jira {
  private static jiraUrl = env.JIRA_URL;
  private static supportedResources = [UnfurlResourceType.Issue];

  /**
   * Parses a Jira URL and extracts issue information
   */
  public static parseUrl(url: string) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Support atlassian.net domains and custom Jira instances
      if (!hostname.includes("atlassian.net") && !env.JIRA_URL) {
        // If JIRA_URL is set, check if hostname matches
        if (env.JIRA_URL) {
          const jiraHost = new URL(env.JIRA_URL).hostname;
          if (hostname !== jiraHost) {
            return;
          }
        } else {
          return;
        }
      }

      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      // Jira issue URLs: /browse/{ISSUE_KEY} or /secure/Tests.jspa#/testCase/{ISSUE_KEY}
      const browseIndex = pathParts.indexOf("browse");
      if (browseIndex !== -1 && pathParts[browseIndex + 1]) {
        const issueKey = pathParts[browseIndex + 1];
        return {
          issueKey,
          url,
        };
      }

      return;
    } catch (_err) {
      return;
    }
  }

  /**
   * Gets an access token from Jira using the integration's stored token
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
   * Fetches a Jira issue
   */
  private static async fetchIssue(
    issueKey: string,
    accessToken: string
  ): Promise<JiraIssue | null> {
    const baseUrl = Jira.jiraUrl || "https://yourcompany.atlassian.net";

    try {
      const response = await fetch(
        `${baseUrl}/rest/api/3/issue/${issueKey}`,
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
        throw new Error(`Jira API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Logger.warn("Failed to fetch issue from Jira", error);
      return null;
    }
  }

  /**
   * Transforms Jira issue data to Outline format
   */
  private static transformIssue(issue: JiraIssue): UnfurlIssueOrPR {
    const statusColor = issue.fields.status.statusCategory.colorName;
    return {
      type: UnfurlResourceType.Issue,
      url: issue.self.replace("/rest/api/3/issue/", "/browse/"),
      id: issue.key,
      title: issue.fields.summary,
      description: issue.fields.description || null,
      author: {
        name: issue.fields.creator.displayName,
        avatarUrl: issue.fields.creator.avatarUrls["48x48"] || "",
      },
      state: {
        name: issue.fields.status.name,
        color: Jira.getColorForStatus(statusColor),
      },
      createdAt: issue.fields.created,
    };
  }

  /**
   * Gets color for issue status
   */
  private static getColorForStatus(colorName: string): string {
    switch (colorName.toLowerCase()) {
      case "green":
        return "#10B981"; // Green
      case "yellow":
        return "#F59E0B"; // Yellow
      case "blue-gray":
      case "bluegrey":
        return "#6B7280"; // Gray
      case "red":
        return "#EF4444"; // Red
      default:
        return "#3B82F6"; // Blue
    }
  }

  /**
   * Unfurls a Jira URL
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = Jira.parseUrl(url);

    if (!resource) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.Jira,
        teamId: actor.teamId,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const accessToken = await Jira.getAccessToken(integration);
      if (!accessToken) {
        return { error: "No access token available" };
      }

      const issue = await Jira.fetchIssue(resource.issueKey, accessToken);

      if (!issue) {
        return { error: "Issue not found" };
      }

      return Jira.transformIssue(issue);
    } catch (err) {
      Logger.warn("Failed to fetch resource from Jira", err);
      return { error: err instanceof Error ? err.message : "Unknown error" };
    }
  };
}
