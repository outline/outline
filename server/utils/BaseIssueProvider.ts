import type { IssueSource } from "@shared/schema";
import type {
  IntegrationType,
  IssueTrackerIntegrationService,
} from "@shared/types";
import type { Integration } from "@server/models";

export abstract class BaseIssueProvider {
  service: IssueTrackerIntegrationService;

  constructor(service: IssueTrackerIntegrationService) {
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
