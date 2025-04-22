import { Endpoints } from "@octokit/types";
import { IssueSource } from "@shared/schema";
import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
import { BaseIssueProvider } from "@server/utils/BaseIssueProvider";
import { GitHub } from "./github";

// This is needed to handle Octokit paginate response type mismatch.
type ReposForInstallation =
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"];

export class GitHubIssueProvider extends BaseIssueProvider {
  constructor() {
    super(IntegrationService.GitHub);
  }

  async fetchSources(
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]> {
    const client = await GitHub.authenticateAsInstallation(
      integration.settings.github!.installation.id
    );

    const sources: IssueSource[] = [];

    for await (const response of client.requestRepos()) {
      const repos = response.data as unknown as ReposForInstallation;
      sources.push(
        ...repos.map<IssueSource>((repo) => ({
          id: String(repo.id),
          name: repo.name,
          owner: { id: String(repo.owner.id), name: repo.owner.login },
          service: IntegrationService.GitHub,
        }))
      );
    }

    return sources;
  }
}
