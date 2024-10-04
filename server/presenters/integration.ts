import { Integration } from "@server/models";

export default function presentIntegration(integration: Integration) {
  return {
    id: integration.id,
    type: integration.type,
    userId: integration.userId,
    collectionId: integration.collectionId,
    authenticationId: integration.authenticationId,
    service: integration.service,
    events: integration.events,
    settings: integration.settings,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}
