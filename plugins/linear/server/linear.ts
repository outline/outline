import type { Issue, WorkflowState } from "@linear/sdk";
import { LinearClient } from "@linear/sdk";
import sortBy from "lodash/sortBy";
import { z } from "zod";
import type { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration } from "@server/models";
import type User from "@server/models/User";
import type { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import { LinearUtils } from "../shared/LinearUtils";
import env from "./env";
import { Minute } from "@shared/utils/time";
import { opts } from "@server/utils/i18n";
import { t } from "i18next";

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  // Linear is in the process of switching to short-lived refresh tokens. Some apps
  // may not return a refresh token before April 2026, hence it's optional here.
  refresh_token: z.string().optional(),
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

    if (res.status !== 200) {
      throw new Error(
        `Error while exchanging oauth code from Linear; status: ${res.status}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  }

  static async refreshToken(refreshToken: string) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    const body = new URLSearchParams();
    body.set("refresh_token", refreshToken);
    body.set("client_id", env.LINEAR_CLIENT_ID!);
    body.set("client_secret", env.LINEAR_CLIENT_SECRET!);
    body.set("grant_type", "refresh_token");

    const res = await fetch(LinearUtils.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    if (res.status !== 200) {
      throw new Error(
        `Error while refreshing access token from Linear; status: ${res.status}`
      );
    }

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
  static unfurl: UnfurlSignature = async (url: string, actor?: User) => {
    const resource = Linear.parseUrl(url);

    if (!resource || !actor) {
      return;
    }

    const integrations = (await Integration.scope("withAuthentication").findAll(
      {
        where: {
          service: IntegrationService.Linear,
          teamId: actor.teamId,
        },
      }
    )) as Integration<IntegrationType.Embed>[];

    if (integrations.length === 0) {
      return;
    }

    // Prefer integration with matching workspaceKey, otherwise pick the first one
    const integration =
      integrations.find(
        (int) => int.settings.linear?.workspace.key === resource.workspaceKey
      ) ?? integrations[0];

    try {
      const accessToken = await integration.authentication.refreshTokenIfNeeded(
        async (refreshToken: string) => Linear.refreshToken(refreshToken),
        5 * Minute.ms
      );

      const client = new LinearClient({ accessToken });
      const issue = await client.issue(resource.id);

      if (!issue) {
        return { error: "Resource not found" };
      }

      const [author, state, labels] = await Promise.all([
        issue.creator,
        issue.state,
        issue.paginate(issue.labels, {}),
      ]);

      if (!state || !labels) {
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
          name:
            author?.name ??
            issue.botActor?.userDisplayName ??
            issue.botActor?.name ??
            t("Unknown", opts(actor)),
          avatarUrl: author?.avatarUrl ?? "",
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
      } satisfies UnfurlIssueOrPR;
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
   * @returns An object containing resource identifiers - `workspaceKey`, `type`, `id` and `name`.
   */
  private static parseUrl(url: string) {
    try {
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
    } catch (_err) {
      // Invalid URL format
      return;
    }
  }
}
