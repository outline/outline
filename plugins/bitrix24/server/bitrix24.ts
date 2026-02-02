import { Sequelize } from "sequelize";
import type { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { Integration } from "@server/models";
import type { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import env from "./env";

interface Bitrix24Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdDate: string;
  responsibleId: string;
  creatorId: string;
  groupId: string;
  stageId: string;
  webUrl: string;
}

export class Bitrix24 {
  private static domain = env.BITRIX24_DOMAIN || "bitrix24.com";
  private static supportedResources = [UnfurlResourceType.Issue];

  /**
   * Parses a Bitrix24 URL and extracts task information
   */
  public static parseUrl(url: string) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Support both .bitrix24.com and .bitrix24.ru domains
      if (
        !hostname.includes("bitrix24.com") &&
        !hostname.includes("bitrix24.ru")
      ) {
        return;
      }

      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      // Bitrix24 task URLs: /company/personal/user/{user_id}/tasks/task/view/{task_id}/
      // or /workgroups/group/{group_id}/tasks/task/view/{task_id}/
      const taskIndex = pathParts.indexOf("task");
      if (taskIndex === -1 || pathParts[taskIndex + 1] !== "view") {
        return;
      }

      const taskId = pathParts[taskIndex + 2];
      if (!taskId) {
        return;
      }

      return {
        domain: hostname,
        taskId,
        url,
      };
    } catch (_err) {
      return;
    }
  }

  /**
   * Gets an access token from Bitrix24 using the integration's stored token
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
   * Fetches a Bitrix24 task
   */
  private static async fetchTask(
    domain: string,
    taskId: string,
    accessToken: string
  ): Promise<Bitrix24Task | null> {
    try {
      const response = await fetch(
        `https://${domain}/rest/tasks.task.get?auth=${accessToken}&taskId=${taskId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Bitrix24 API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        return null;
      }

      const task = data.result.task;
      return {
        id: task.id,
        title: task.title,
        description: task.description || null,
        status: task.status,
        createdDate: task.createdDate,
        responsibleId: task.responsibleId,
        creatorId: task.creatorId,
        groupId: task.groupId,
        stageId: task.stageId,
        webUrl: `https://${domain}/company/personal/user/${task.responsibleId}/tasks/task/view/${task.id}/`,
      };
    } catch (error) {
      Logger.warn("Failed to fetch task from Bitrix24", error);
      return null;
    }
  }

  /**
   * Transforms Bitrix24 task data to Outline format
   */
  private static transformTask(task: Bitrix24Task): UnfurlIssueOrPR {
    return {
      type: UnfurlResourceType.Issue,
      url: task.webUrl,
      id: `#${task.id}`,
      title: task.title,
      description: task.description,
      state: {
        name: task.status,
        color: Bitrix24.getColorForStatus(task.status),
      },
      createdAt: task.createdDate,
    };
  }

  /**
   * Gets color for task status
   */
  private static getColorForStatus(status: string): string {
    switch (status.toLowerCase()) {
      case "new":
      case "pending":
        return "#10B981"; // Green
      case "in_progress":
        return "#3B82F6"; // Blue
      case "waiting":
        return "#F59E0B"; // Yellow
      case "completed":
      case "done":
        return "#8B5CF6"; // Purple
      case "deferred":
      case "cancelled":
        return "#EF4444"; // Red
      default:
        return "#6B7280"; // Gray
    }
  }

  /**
   * Unfurls a Bitrix24 URL
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = Bitrix24.parseUrl(url);

    if (!resource) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.Bitrix24,
        teamId: actor.teamId,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const accessToken = await Bitrix24.getAccessToken(integration);
      if (!accessToken) {
        return { error: "No access token available" };
      }

      const task = await Bitrix24.fetchTask(
        resource.domain,
        resource.taskId,
        accessToken
      );

      if (!task) {
        return { error: "Task not found" };
      }

      return Bitrix24.transformTask(task);
    } catch (err) {
      Logger.warn("Failed to fetch resource from Bitrix24", err);
      return { error: err instanceof Error ? err.message : "Unknown error" };
    }
  };
}
