import { IntegrationService } from "../../shared/types";

/** Add the service here when a new IMIntegrationProcessor subclass is implemented */
const IMIntegrationServices = [IntegrationService.Mattermost];

export const isIMIntegrationService = (service: IntegrationService) =>
  IMIntegrationServices.includes(service);
