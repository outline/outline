import { Integration, User } from "@server/models";
import { CreateIssueResponse } from "@server/types";
import { IssueSource } from "@shared/schema";
import {
  IntegrationType,
  IssueProviderIntegrationService,
} from "@shared/types";
import { Minute } from "@shared/utils/time";

export abstract class BaseIssueProvider {
  service: IssueProviderIntegrationService;
  cacheExpiry: number;

  constructor(service: IssueProviderIntegrationService, cacheExpiry?: number) {
    this.service = service;
    this.cacheExpiry = cacheExpiry ?? Minute.seconds;
  }

  abstract fetchSources(
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]>;

  abstract createIssue(
    title: string,
    source: IssueSource,
    actor: User
  ): Promise<CreateIssueResponse | undefined>;
}
