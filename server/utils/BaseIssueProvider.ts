import { IssueSource } from "@shared/schema";
import { IntegrationType, IssueTrackerIntegrationService } from "@shared/types";
import { Integration } from "@server/models";

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
  }: {
    payload: Record<string, unknown>;
    headers: Record<string, unknown>;
  }): Promise<void>;
}
