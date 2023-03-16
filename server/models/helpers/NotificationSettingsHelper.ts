import crypto from "crypto";
import {
  NotificationEventDefaults,
  NotificationEventType,
} from "@shared/types";
import env from "@server/env";
import User from "../User";

export default class NotificationSettingsHelper {
  public static getDefaults() {
    return NotificationEventDefaults;
  }

  public static unsubscribeUrl(user: User, eventType: NotificationEventType) {
    return `${
      env.URL
    }/api/notifications.unsubscribe?token=${this.unsubscribeToken(
      user,
      eventType
    )}&userId=${user.id}eventType=${eventType}`;
  }

  public static unsubscribeToken(user: User, eventType: NotificationEventType) {
    const hash = crypto.createHash("sha256");
    hash.update(`${user.id}-${env.SECRET_KEY}-${eventType}`);
    return hash.digest("hex");
  }
}
