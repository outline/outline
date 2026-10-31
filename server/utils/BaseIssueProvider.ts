import type { IssueSource } from "@shared/schema";
import type { IntegrationService, IntegrationType } from "@shared/types";
import type { Integration } from "@server/models";

export abstract class BaseIssueProvider {
  service: IntegrationService;

  constructor(service: IntegrationService) {
    this.service = service;
  }

  abstract fetchSources(
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]>;

  abstract handleWebhook({
    payload,
    headers,
    teamId,
  }: {
    payload: Record<string, unknown>;
    headers: Record<string, unknown>;
    /** The authorized team, or null for a provider-wide webhook secret. */
    teamId: string | null;
  }): Promise<void>;
}
