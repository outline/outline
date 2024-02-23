import { App } from "octokit";
import pluralize from "pluralize";
import { IntegrationService, IntegrationType } from "@shared/types";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Integration, User } from "@server/models";
import { GitHub } from "./github";

export const unfurl = async (url: string, actor: User) => {
  if (!(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY)) {
    return;
  }
  const app = new App({
    appId: env.GITHUB_APP_ID,
    privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
      "ascii"
    ),
  });

  const { owner, repo, resourceType, resourceId } = GitHub.parseUrl(url);

  if (!owner) {
    return;
  }

  const integration = (await Integration.findOne({
    where: {
      service: IntegrationService.GitHub,
      userId: actor.id,
      teamId: actor.teamId,
      "settings.github.installation.account.name": owner,
    },
  })) as Integration<IntegrationType.Embed>;

  if (!integration) {
    return;
  }

  try {
    const octokit = await app.getInstallationOctokit(
      integration.settings.github!.installation.id
    );
    const { data } = await octokit.request(
      `GET /repos/{owner}/{repo}/${pluralize(resourceType)}/{ref}`,
      {
        owner,
        repo,
        ref: resourceId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return {
      url,
      type: resourceType,
      title: data.title,
      description: data.body,
      author: {
        name: data.user.login,
        avatarUrl: data.user.avatar_url,
      },
      meta: {
        labels: data.labels.map((label: any) => ({
          name: label.name,
          color: label.color,
        })),
        status: { name: data.state },
      },
    };
  } catch (err) {
    return Logger.warn("Failed to fetch resource from GitHub", err);
  }
};
