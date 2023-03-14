import { NotificationEventType } from "@shared/types";
import NotificationSetting from "../NotificationSetting";
import User from "../User";

export const NotificationEventDefaults = {
  [NotificationEventType.PublishDocument]: false,
  [NotificationEventType.UpdateDocument]: true,
  [NotificationEventType.CreateCollection]: false,
  [NotificationEventType.InviteAccepted]: true,
  [NotificationEventType.Onboarding]: true,
  [NotificationEventType.Features]: true,
  [NotificationEventType.ExportCompleted]: true,
};

export default class NotificationSettingsHelper {
  public static async getUserNotificationPreference(
    user: User,
    eventType: NotificationEventType
  ): Promise<boolean> {
    const setting = await NotificationSetting.findOne({
      attributes: ["id"],
      where: {
        userId: user.id,
        event: eventType,
      },
    });

    return (setting ? true : NotificationEventDefaults[eventType]) ?? false;
  }
}
