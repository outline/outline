import { NotificationEventType } from "@shared/types";
import { getBaseDomain } from "@shared/utils/domains";

const EmailThreadSupportedNotifications = [
  NotificationEventType.PublishDocument,
  NotificationEventType.UpdateDocument,
  NotificationEventType.MentionedInDocument,
  NotificationEventType.CreateComment,
  NotificationEventType.MentionedInComment,
];

// Gmail creates a new thread for every 100 messages.
export const MaxMessagesInEmailThread = 100;

export const isEmailThreadSupportedNotification = (
  event: NotificationEventType
) => EmailThreadSupportedNotifications.includes(event);

export const getEmailThreadEventGroup = (
  event: NotificationEventType
): NotificationEventType[] | undefined => {
  switch (event) {
    case NotificationEventType.PublishDocument:
    case NotificationEventType.UpdateDocument:
      return [
        NotificationEventType.PublishDocument,
        NotificationEventType.UpdateDocument,
      ];
    case NotificationEventType.MentionedInDocument:
    case NotificationEventType.MentionedInComment:
      return [
        NotificationEventType.MentionedInDocument,
        NotificationEventType.MentionedInComment,
      ];
    case NotificationEventType.CreateComment:
      return [NotificationEventType.CreateComment];
    default:
      return;
  }
};

let baseDomain;

export const getEmailMessageId = (notificationId: string) => {
  baseDomain ||= getBaseDomain();
  return `<${notificationId}@${baseDomain}>`;
};
