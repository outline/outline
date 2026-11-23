import type { Integration } from "@server/models";
import type { Context } from "@server/types";

/**
 * Presents an integration for API responses.
 *
 * @param ctx the context, used to find the user the integration is presented to.
 * @param integration the integration to present.
 * @returns the presented integration.
 */
export default function presentIntegration(
  ctx: Context | undefined,
  integration: Integration
) {
  return {
    id: integration.id,
    type: integration.type,
    userId: integration.userId,
    collectionId: integration.collectionId,
    authenticationId: integration.authenticationId,
    service: integration.service,
    events: integration.events,
    settings: integration.presentSettings(ctx?.auth.user),
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}
