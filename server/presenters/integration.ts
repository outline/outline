import type { Integration } from "@server/models";
import { can } from "@server/policies";
import type { APIContext } from "@server/types";

export default function presentIntegration(
  ctx: APIContext | undefined,
  integration: Integration
) {
  const user = ctx?.state.auth.user;
  const canViewSettings =
    !ctx ||
    integration.hasPublicSettings ||
    (!!user && can(user, "update", integration));

  return {
    id: integration.id,
    type: integration.type,
    userId: integration.userId,
    collectionId: integration.collectionId,
    authenticationId: integration.authenticationId,
    service: integration.service,
    events: integration.events,
    settings: canViewSettings ? integration.settings : undefined,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}
