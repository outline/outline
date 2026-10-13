/** Events that a user can subscribe to. */
export enum SubscriptionType {
  Document = "documents.update",
}

/** Events that can trigger a notification. */
export enum NotificationEventType {
  PublishDocument = "documents.publish",
  UpdateDocument = "documents.update",
  AddUserToDocument = "documents.add_user",
  AddUserToCollection = "collections.add_user",
  AddUserToGroup = "groups.add_user",
  RemoveUserFromGroup = "groups.remove_user",
  CreateRevision = "revisions.create",
  CreateCollection = "collections.create",
  CreateComment = "comments.create",
  ResolveComment = "comments.resolve",
  ReactionsCreate = "reactions.create",
  MentionedInDocument = "documents.mentioned",
  MentionedInComment = "comments.mentioned",
  GroupMentionedInDocument = "documents.group_mentioned",
  GroupMentionedInComment = "comments.group_mentioned",
  InviteAccepted = "emails.invite_accepted",
  Onboarding = "emails.onboarding",
  Features = "emails.features",
  ExportCompleted = "emails.export_completed",
  RequestDocumentAccess = "access_requests.create",
}

/** Channels that a notification can be delivered through. */
export enum NotificationChannelType {
  App = "app",
  Email = "email",
  Chat = "chat",
}

/** Extra data stored on a notification. */
export type NotificationData = {
  emoji?: string;
};

/** A user's notification settings, by event and optionally by channel. */
export type NotificationSettings = {
  [event in NotificationEventType]?:
    | {
        [type in NotificationChannelType]?: boolean;
      }
    | boolean;
};

/** Whether each notification event is enabled when the user has no setting. */
export const NotificationEventDefaults: Record<NotificationEventType, boolean> =
  {
    [NotificationEventType.PublishDocument]: false,
    [NotificationEventType.UpdateDocument]: true,
    [NotificationEventType.CreateCollection]: false,
    [NotificationEventType.CreateComment]: true,
    [NotificationEventType.ResolveComment]: true,
    [NotificationEventType.ReactionsCreate]: true,
    [NotificationEventType.CreateRevision]: false,
    [NotificationEventType.MentionedInDocument]: true,
    [NotificationEventType.MentionedInComment]: true,
    [NotificationEventType.GroupMentionedInDocument]: true,
    [NotificationEventType.GroupMentionedInComment]: true,
    [NotificationEventType.InviteAccepted]: true,
    [NotificationEventType.Onboarding]: true,
    [NotificationEventType.Features]: true,
    [NotificationEventType.ExportCompleted]: true,
    [NotificationEventType.AddUserToDocument]: true,
    [NotificationEventType.AddUserToCollection]: true,
    [NotificationEventType.AddUserToGroup]: true,
    [NotificationEventType.RemoveUserFromGroup]: true,
    [NotificationEventType.RequestDocumentAccess]: true,
  };

/** Notices shown to the user from the `notice` query parameter. */
export enum QueryNotices {
  UnsubscribeDocument = "unsubscribe-document",
  UnsubscribeCollection = "unsubscribe-collection",
  Subscribed = "subscribed",
  Unsubscribed = "unsubscribed",
}
