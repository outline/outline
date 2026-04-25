import { useMemo } from "react";
import type WebhookSubscription from "~/models/WebhookSubscription";
import { useMenuAction } from "~/hooks/useMenuAction";
import {
  deleteWebhookSubscriptionFactory,
  editWebhookSubscriptionFactory,
} from "../actions";

/**
 * Hook that constructs the action menu for webhook subscription operations.
 *
 * @param webhook - the webhook subscription to build actions for.
 * @returns action with children for use in menus.
 */
export function useWebhookSubscriptionMenuActions(
  webhook: WebhookSubscription
) {
  const actions = useMemo(
    () => [
      editWebhookSubscriptionFactory({ webhook }),
      deleteWebhookSubscriptionFactory({ webhook }),
    ],
    [webhook]
  );
  return useMenuAction(actions);
}
