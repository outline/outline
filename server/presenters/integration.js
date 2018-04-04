// @flow
import { Integration } from '../models';

function present(ctx: Object, integration: Integration) {
  return {
    id: integration.id,
    type: integration.type,
    userId: integration.userId,
    teamId: integration.teamId,
    serviceId: integration.serviceId,
    collectionId: integration.collectionId,
    authenticationId: integration.authenticationId,
    events: integration.events,
    settings: integration.settings,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

export default present;
