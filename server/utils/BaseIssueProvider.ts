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
}
