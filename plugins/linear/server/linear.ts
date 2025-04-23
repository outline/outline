import { LinearClient } from "@linear/sdk";
import Logger from "@server/logging/Logger";
import { Integration } from "@server/models";
import User from "@server/models/User";
import { UnfurlIssueAndPR, UnfurlSignature } from "@server/types";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import { z } from "zod";
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
        "settings.linear.workspace.name": resource.workspace,
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
        },
        createdAt: issue.createdAt.toISOString(),
        transformed_unfurl: true,
      } satisfies UnfurlIssueAndPR;
    } catch (err) {
      Logger.warn("Failed to fetch resource from Linear", err);
      return { error: err.message || "Unknown error" };
    }
  };

  /**
   * Parses a given URL and returns resource identifiers for Linear specific URLs
   *
   * @param url URL to parse
   * @returns {object} Containing resource identifiers - `workspace`, `type`, `id` and `name`.
   */
  private static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "linear.app") {
      return;
    }

    const parts = pathname.split("/");
    const workspace = parts[1];
    const type = parts[2] ? (parts[2] as UnfurlResourceType) : undefined;
    const id = parts[3];
    const name = parts[4];

    if (!type || !Linear.supportedUnfurls.includes(type)) {
      return;
    }

    return { workspace, type, id, name };
  }
}
