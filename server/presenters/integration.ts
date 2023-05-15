import { Integration } from "@server/models";

type Options = {
  includeToken?: boolean;
};

export default function presentIntegration(
  integration: Integration,
  options?: Options
) {
  return {
    id: integration.id,
    type: integration.type,
    userId: integration.userId,
    teamId: integration.teamId,
    collectionId: integration.collectionId,
    authenticationId: integration.authenticationId,
    token:
      options && options.includeToken && integration.authentication
        ? integration.authentication.token
        : undefined,
    service: integration.service,
    events: integration.events,
    settings: integration.settings,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}
