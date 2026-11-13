import { toError } from "@shared/utils/error";
import type { IssueSource } from "@shared/schema";
import { IntegrationService, type IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { Integration } from "@server/models";
import { IntegrationAuthentication } from "@server/models";
import { BaseIssueProvider } from "@server/utils/BaseIssueProvider";
import { Gitea } from "./gitea";

export class GiteaIssueProvider extends BaseIssueProvider {
  constructor() {
    super(IntegrationService.Gitea);
  }

  async fetchSources(
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]> {
    await integration.reload({
      include: [
        {
          model: IntegrationAuthentication,
          as: "authentication",
          required: true,
        },
      ],
    });

    const baseUrl = integration.settings?.gitea?.url;
    if (!integration.authentication || !baseUrl) {
      Logger.warn("Gitea integration without authentication");
      return [];
    }

    try {
      const { authentication } = integration;
      const accessToken = await authentication.refreshTokenIfNeeded(
        async (refreshToken: string) =>
          Gitea.refreshToken({
            baseUrl,
            refreshToken,
            clientId: authentication.clientId,
            clientSecret: authentication.clientSecret,
          })
      );
      const repositories = await Gitea.getRepositories({
        baseUrl,
        accessToken,
      });

      return repositories.map<IssueSource>((repo) => ({
        id: String(repo.id),
        name: repo.name,
        owner: {
          id: String(repo.owner.id),
          name: repo.owner.login,
        },
        service: IntegrationService.Gitea,
      }));
    } catch (err) {
      Logger.warn("Failed to fetch repositories from Gitea", toError(err));
      return [];
    }
  }

  async handleWebhook() {
    // Gitea has no application level webhooks to subscribe to.
  }
}
