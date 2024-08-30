import { NotificationEventType } from "@shared/types";

const Domain = "outline.com";

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

export const getEmailMessageId = (text: string) => `<${text}@${Domain}`;
