import crypto from "crypto";
import {
  NotificationEventDefaults,
  NotificationEventType,
} from "@shared/types";
import env from "@server/env";

/**
 * Helper class for working with notification settings
 */
export default class NotificationSettingsHelper {
  /**
   * Get the default notification settings for a user
   *
   * @returns The default notification settings
   */
  public static getDefaults() {
    return NotificationEventDefaults;
  }

  /**
   * Get the unsubscribe URL for a user and event type. This url allows the user
   * to unsubscribe from a specific event without being signed in, for one-click
   * links in emails.
   *
   * @param userId The user ID to unsubscribe
   * @param eventType The event type to unsubscribe from
   * @returns The unsubscribe URL
   */
  public static unsubscribeUrl(
    userId: string,
    eventType: NotificationEventType
  ) {
    return `${
      env.URL
    }/api/notifications.unsubscribe?token=${this.unsubscribeToken(
      userId,
      eventType
    )}&userId=${userId}&eventType=${eventType}`;
  }

  public static unsubscribeToken(
    userId: string,
    eventType: NotificationEventType
  ) {
    const hash = crypto.createHash("sha256");
    hash.update(`${userId}-${env.SECRET_KEY}-${eventType}`);
    return hash.digest("hex");
  }
}
