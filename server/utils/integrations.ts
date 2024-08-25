import { IntegrationService } from "../../shared/types";

/** Add the service here when a new IMIntegrationProcessor is created */
const IMIntegrationServices = [IntegrationService.Mattermost];

export const isIMIntegrationService = (service: IntegrationService) =>
  IMIntegrationServices.includes(service);
