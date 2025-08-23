import axios, { AxiosInstance } from "axios";
import { UnfurlResourceType, JiraIssueResponse } from "@shared/types";
import { User } from "@server/models";
import { UnfurlIssueOrPR } from "@server/types";
import env from "./env";

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: {
      iconUrl: string;
      name: string;
    };
    status: {
      name: string;
      statusCategory: {
        colorName: string;
      };
    };
    priority: {
      name: string;
      iconUrl: string;
    };
    assignee: {
      displayName: string;
      avatarUrls: {
        "48x48": string;
      };
    } | null;
    // Custom fields - will be dynamically handled based on env configuration
    [key: string]: any;
  };
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export class Jira {
  private static client: AxiosInstance;

  static initialize() {
    if (!env.JIRA_URL || !env.JIRA_EMAIL || !env.JIRA_APP_TOKEN) {
      throw new Error("Jira URL, email, and app token are required");
    }

    // Create base64 encoded credentials for Basic Auth
    const credentials = Buffer.from(
      `${env.JIRA_EMAIL}:${env.JIRA_APP_TOKEN}`
    ).toString("base64");

    this.client = axios.create({
      baseURL: `${env.JIRA_URL}/rest/api/3`,
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    });

    return this;
  }

  static parseUrl(url: string): {
    type: UnfurlResourceType;
    issueKey: string;
  } | null {
    // Check if JIRA_URL is configured
    if (!env.JIRA_URL) {
      return null;
    }

    // Extract domain from JIRA_URL
    const jiraDomain = new URL(env.JIRA_URL).hostname;

    // Pattern for Jira issue URLs - dynamic based on JIRA_URL
    // Examples:
    // https://ovaledge.atlassian.net/browse/NFD-29514
    // https://ovaledge.atlassian.net/projects/NFD/issues/NFD-29514
    const patterns = [
      new RegExp(
        `^https?://${jiraDomain.replace(/\./g, "\\.")}/browse/([A-Z]+-\\d+)`
      ),
      new RegExp(
        `^https?://${jiraDomain.replace(/\./g, "\\.")}/projects/[^/]+/issues/([A-Z]+-\\d+)`
      ),
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const [, issueKey] = match;
        return { type: UnfurlResourceType.Issue, issueKey };
      }
    }

    return null;
  }

  static async unfurl(
    url: string,
    _user: User
  ): Promise<UnfurlIssueOrPR | null> {
    const resource = Jira.parseUrl(url);
    if (!resource) {
      return null;
    }

    // Initialize the client if not already done
    if (!this.client) {
      this.initialize();
    }

    try {
      const response = await this.requestIssue(resource.issueKey);
      if (!response) {
        return null;
      }

      const { data } = response;
      const issue = data as JiraIssue;

      // Build labels array with priority and custom fields
      const labels: Array<{ name: string; color: string; iconUrl?: string }> = [
        {
          name: `Priority: ${issue.fields.priority.name}`,
          color: this.getPriorityColor(issue.fields.priority.name),
          iconUrl: issue.fields.priority.iconUrl,
        },
      ];

      // Add custom field labels if configured
      if (env.JIRA_CUSTOM_FIELDS) {
        try {
          const customFields = JSON.parse(env.JIRA_CUSTOM_FIELDS);
          if (Array.isArray(customFields)) {
            customFields.forEach((fieldConfig) => {
              const fieldValue = issue.fields[fieldConfig.field];
              if (fieldValue) {
                // Handle different field value formats
                let displayValue = "";
                if (typeof fieldValue === "string") {
                  displayValue = fieldValue;
                } else if (
                  fieldValue &&
                  typeof fieldValue === "object" &&
                  fieldValue.value
                ) {
                  displayValue = fieldValue.value;
                }

                if (displayValue) {
                  labels.push({
                    name: `${fieldConfig.label}: ${displayValue}`,
                    color: "#0366d6", // Default color for custom fields
                  });
                }
              }
            });
          }
        } catch (_error) {
          // Silently handle custom field parsing errors
        }
      }

      const result: JiraIssueResponse = {
        type: UnfurlResourceType.Issue,
        id: issue.key,
        title: issue.fields.summary,
        description: null, // No description in new API
        url: url,
        author: {
          name: issue.fields.assignee?.displayName || "Unassigned",
          avatarUrl: issue.fields.assignee?.avatarUrls["48x48"] || "",
        },
        assignee: issue.fields.assignee
          ? {
              name: issue.fields.assignee.displayName,
              avatarUrl: issue.fields.assignee.avatarUrls["48x48"],
            }
          : undefined,
        state: {
          name: issue.fields.status.name,
          color: this.getColorForStatus(
            issue.fields.status.statusCategory.colorName
          ),
        },
        labels,
        createdAt: new Date().toISOString(), // No created date in new API, use current time
        // Add issue type icon URL for the frontend
        issueTypeIconUrl: issue.fields.issuetype.iconUrl,
      };

      return result;
    } catch (_error) {
      return null;
    }
  }

  private static async requestIssue(issueKey: string) {
    try {
      // Build fields parameter dynamically
      let fields = "summary,assignee,priority,issuetype,status";

      // Add custom fields if configured
      if (env.JIRA_CUSTOM_FIELDS) {
        try {
          const customFields = JSON.parse(env.JIRA_CUSTOM_FIELDS);
          if (Array.isArray(customFields)) {
            const customFieldNames = customFields.map((field) => field.field);
            fields += `,${customFieldNames.join(",")}`;
          }
        } catch (_error) {
          // Silently handle custom field parsing errors
        }
      }

      const response = await this.client.get(`/issue/${issueKey}`, {
        params: { fields },
      });

      return response;
    } catch (_error) {
      return null;
    }
  }

  private static getColorForStatus(colorName: string): string {
    const colorMap: Record<string, string> = {
      "medium-gray": "#6c757d",
      green: "#28a745",
      yellow: "#ffc107",
      red: "#dc3545",
      "blue-gray": "#6c757d",
      blue: "#007bff",
      orange: "#fd7e14",
      purple: "#6f42c1",
    };

    return colorMap[colorName] || "#6c757d";
  }

  private static getPriorityColor(priorityName: string): string {
    const priorityColorMap: Record<string, string> = {
      Highest: "#dc3545",
      High: "#fd7e14",
      Medium: "#ffc107",
      Low: "#28a745",
      Lowest: "#6c757d",
    };

    return priorityColorMap[priorityName] || "#6c757d";
  }

  static async getProjects() {
    if (!this.client) {
      this.initialize();
    }

    try {
      const response = await this.client.get("/project");
      return response.data as JiraProject[];
    } catch (_error) {
      return [];
    }
  }

  static async getUser() {
    if (!this.client) {
      this.initialize();
    }

    try {
      const response = await this.client.get("/myself");
      return response.data;
    } catch (_error) {
      return null;
    }
  }
}
