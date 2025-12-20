import { ArchiveIcon, CheckmarkIcon, MarkAsReadIcon } from "outline-icons";
import { createAction } from "..";
import { NotificationSection } from "../sections";
import type Notification from "~/models/Notification";

export const markNotificationsAsRead = createAction({
  name: ({ t }) => t("Mark notifications as read"),
  analyticsName: "Mark notifications as read",
  section: NotificationSection,
  icon: <MarkAsReadIcon />,
  shortcut: ["Shift+Escape"],
  perform: ({ stores }) => stores.notifications.markAllAsRead(),
  visible: ({ stores }) => stores.notifications.approximateUnreadCount > 0,
});

export const markNotificationsAsArchived = createAction({
  name: ({ t }) => t("Archive all notifications"),
  analyticsName: "Mark notifications as archived",
  section: NotificationSection,
  icon: <ArchiveIcon />,
  iconInContextMenu: false,
  perform: ({ stores }) => stores.notifications.markAllAsArchived(),
  visible: ({ stores }) => stores.notifications.orderedData.length > 0,
});

export const notificationMarkRead = (notification: Notification) =>
  createAction({
    name: ({ t }) => t("Mark as read"),
    analyticsName: "Mark notification read",
    section: NotificationSection,
    icon: <CheckmarkIcon />,
    perform: () => notification.toggleRead(),
    visible: () => !notification.viewedAt,
  });

export const notificationMarkUnread = (notification: Notification) =>
  createAction({
    name: ({ t }) => t("Mark as unread"),
    analyticsName: "Mark notification unread",
    section: NotificationSection,
    icon: <CheckmarkIcon />,
    perform: () => notification.toggleRead(),
    visible: () => !!notification.viewedAt,
  });

export const notificationArchive = (notification: Notification) =>
  createAction({
    name: ({ t }) => t("Archive"),
    analyticsName: "Mark notification as archived",
    section: NotificationSection,
    icon: <ArchiveIcon />,
    perform: () => notification.archive(),
    visible: () => !notification.archivedAt,
  });

export const rootNotificationActions = [
  markNotificationsAsRead,
  markNotificationsAsArchived,
];
