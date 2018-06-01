// @flow
import { Integration } from '../models';

function present(ctx: Object, integration: Integration) {
  return {
    id: integration.id,
    type: integration.type,
    userId: integration.userId,
    teamId: integration.teamId,
    collectionId: integration.collectionId,
    authenticationId: integration.authenticationId,
    service: integration.service,
    events: integration.events,
    settings: integration.settings,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

export default present;
