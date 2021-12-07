import { Integration } from "@server/models";

// @ts-expect-error ts-migrate(2749) FIXME: 'Integration' refers to a value, but is being used... Remove this comment to see the full error message
export default function present(integration: Integration) {
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
