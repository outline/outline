import queryString from "query-string";
import env from "@server/env";
import ShareSubscription from "@server/models/ShareSubscription";

/**
 * Helper class for working with share subscriptions.
 */
export default class ShareSubscriptionHelper {
  /**
   * Get the confirmation URL for a share subscription.
   *
   * @param subscription The share subscription to confirm.
   * @returns The confirmation URL.
   */
  public static confirmUrl(subscription: ShareSubscription): string {
    const token = ShareSubscription.generateConfirmToken(subscription);

    return `${env.URL}/api/shares.confirmSubscription?${queryString.stringify({
      id: subscription.id,
      token,
    })}`;
  }

  /**
   * Get the unsubscribe URL for a share subscription.
   *
   * @param subscription The share subscription to unsubscribe.
   * @returns The unsubscribe URL.
   */
  public static unsubscribeUrl(subscription: ShareSubscription): string {
    const token = ShareSubscription.generateUnsubscribeToken(subscription);

    return `${env.URL}/api/shares.unsubscribe?${queryString.stringify({
      id: subscription.id,
      token,
    })}`;
  }
}
