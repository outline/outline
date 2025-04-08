import { Endpoints } from "@octokit/types";
import Logger from "@server/logging/Logger";
import { Integration, User } from "@server/models";
import { CreateIssueResponse, IssueProvider } from "@server/types";
import { IssueSource } from "@shared/schema";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import { GitHub } from "./github";

// This is needed to account for Octokit paginate response type mismatch.
type ReposForInstallation =
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"];

export class GitHubIssueProvider {
  public static listRepos: IssueProvider["listSources"] = async (
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]> => {
    const client = await GitHub.authenticateAsInstallation(
      integration.settings.github!.installation.id
    );

    const repos =
      (await client.requestRepos()) as unknown as ReposForInstallation;

    const sources = repos.map<IssueSource>((repo) => ({
      id: String(repo.id),
      name: repo.name,
      account: { id: String(repo.owner.id), name: repo.owner.login },
      service: IntegrationService.GitHub,
    }));

    return sources;
  };

  public static createIssue: IssueProvider["createIssue"] = async (
    title: string,
    source: IssueSource,
    actor: User
  ): Promise<CreateIssueResponse | undefined> => {
    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.GitHub,
        teamId: actor.teamId,
        "settings.github.installation.account.name": source.account.name,
      },
    })) as Integration<IntegrationType.Embed> | undefined;

    if (!integration) {
      return;
    }

    try {
      const client = await GitHub.authenticateAsInstallation(
        integration.settings.github!.installation.id
      );

      const { data } = await client.createIssue({
        owner: source.account.name,
        repo: source.name,
        title,
      });

      return {
        ...data,
        type: UnfurlResourceType.Issue,
        cacheKey: data.html_url,
      };
    } catch (err) {
      Logger.warn("Failed to create issue in GitHub", err);
      return;
    }
  };

  private static getRepos = async (
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]> => {
    const client = await GitHub.authenticateAsInstallation(
      integration.settings.github!.installation.id
    );

    const repos = await client.requestRepos();

    return repos.data.repositories.map<IssueSource>((repo) => ({
      id: String(repo.id),
      name: repo.name,
      account: { id: String(repo.owner.id), name: repo.owner.login },
      service: IntegrationService.GitHub,
    }));
  };
}
