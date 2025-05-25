import { Issue, LinearClient, WorkflowState } from "@linear/sdk";
import sortBy from "lodash/sortBy";
import { z } from "zod";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration } from "@server/models";
import User from "@server/models/User";
import { UnfurlIssueAndPR, UnfurlSignature } from "@server/types";
import { LinearUtils } from "../shared/LinearUtils";
import env from "./env";

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string(),
});

export class Linear {
  private static supportedUnfurls = [UnfurlResourceType.Issue];

  static async oauthAccess(code: string) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    const body = new URLSearchParams();
    body.set("code", code);
    body.set("client_id", env.LINEAR_CLIENT_ID!);
    body.set("client_secret", env.LINEAR_CLIENT_SECRET!);
    body.set("redirect_uri", LinearUtils.callbackUrl());
    body.set("grant_type", "authorization_code");

    const res = await fetch(LinearUtils.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    return AccessTokenResponseSchema.parse(await res.json());
  }

  static async revokeAccess(accessToken: string) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    await fetch(LinearUtils.revokeUrl, {
      method: "POST",
      headers,
    });
  }

  static async getInstalledWorkspace(accessToken: string) {
    const client = new LinearClient({ accessToken });
    return client.organization;
  }

  /**
   *
   * @param url Linear resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a Linear issue details
   */
  static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = Linear.parseUrl(url);

    if (!resource) {
      return;
    }

    const integration = (await Integration.scope("withAuthentication").findOne({
      where: {
        service: IntegrationService.Linear,
        teamId: actor.teamId,
        "settings.linear.workspace.key": resource.workspaceKey,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const client = new LinearClient({
        accessToken: integration.authentication.token,
      });
      const issue = await client.issue(resource.id);

      if (!issue) {
        return { error: "Resource not found" };
      }

      const [author, state, labels] = await Promise.all([
        issue.creator,
        issue.state,
        issue.paginate(issue.labels, {}),
      ]);

      if (!author || !state || !labels) {
        return { error: "Failed to fetch auxiliary data from Linear" };
      }

      const completionPercentage = await Linear.completionPercentage(
        client,
        issue,
        state
      );

      return {
        type: UnfurlResourceType.Issue,
        url: issue.url,
        id: issue.identifier,
        title: issue.title,
        description: issue.description ?? null,
        author: {
          name: author.name,
          avatarUrl: author.avatarUrl ?? "",
        },
        labels: labels.map((label) => ({
          name: label.name,
          color: label.color,
        })),
        state: {
          type: state.type,
          name: state.name,
          color: state.color,
          completionPercentage,
        },
        createdAt: issue.createdAt.toISOString(),
        transformed_unfurl: true,
      } satisfies UnfurlIssueAndPR;
    } catch (err) {
      Logger.warn("Failed to fetch resource from Linear", err);
      return { error: err.message || "Unknown error" };
    }
  };

  private static async completionPercentage(
    client: LinearClient,
    issue: Issue,
    state: WorkflowState
  ) {
    const defaultCompletionPercentage = 0.5; // fallback when we cannot determine actual value.

    if (state.type !== "started") {
      return defaultCompletionPercentage;
    }

    const team = await issue.team;
    if (!team) {
      return defaultCompletionPercentage;
    }

    const allStates = await client.paginate(client.workflowStates, {
      filter: {
        team: { id: { eq: team.id } },
        type: { eq: "started" },
      },
    });
    const states = sortBy(
      allStates.map((s) => ({
        name: s.name,
        position: s.position,
      })),
      (s) => s.position
    );

    const idx = states.findIndex((s) => s.name === state.name);

    if (idx === -1) {
      return defaultCompletionPercentage;
    } else if (states.length === 1) {
      return 0.5;
    } else if (states.length === 2) {
      return idx === 0 ? 0.5 : 0.75;
    } else {
      return (idx + 1) / (states.length + 1); // add 1 to states for the "done" state.
    }
  }

  /**
   * Parses a given URL and returns resource identifiers for Linear specific URLs
   *
   * @param url URL to parse
   * @returns {object} Containing resource identifiers - `workspaceKey`, `type`, `id` and `name`.
   */
  private static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "linear.app") {
      return;
    }

    const parts = pathname.split("/");
    const workspaceKey = parts[1];
    const type = parts[2] ? (parts[2] as UnfurlResourceType) : undefined;
    const id = parts[3];
    const name = parts[4];

    if (!type || !Linear.supportedUnfurls.includes(type)) {
      return;
    }

    return { workspaceKey, type, id, name };
  }
}
