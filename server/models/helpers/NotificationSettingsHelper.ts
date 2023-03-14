import NotificationSetting from "../NotificationSetting";
import User from "../User";

export enum NotificationEventType {
  PublishDocument = "documents.publish",
  UpdateDocument = "documents.update",
  CreateCollection = "collections.create",
  InviteAccepted = "emails.invite_accepted",
  Onboarding = "emails.onboarding",
  Features = "emails.features",
  ExportCompleted = "emails.export_completed",
}

export enum NotificationChannelType {
  App = "app",
  Email = "email",
  Chat = "chat",
}

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
