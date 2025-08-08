import { ArchiveIcon, MarkAsReadIcon } from "outline-icons";
import { createAction, createActionV2 } from "..";
import { NotificationSection } from "../sections";

export const markNotificationsAsRead = createAction({
  name: ({ t }) => t("Mark notifications as read"),
  analyticsName: "Mark notifications as read",
  section: NotificationSection,
  icon: <MarkAsReadIcon />,
  shortcut: ["Shift+Escape"],
  perform: ({ stores }) => stores.notifications.markAllAsRead(),
  visible: ({ stores }) => stores.notifications.approximateUnreadCount > 0,
});

export const markNotificationsAsArchived = createActionV2({
  name: ({ t }) => t("Archive all notifications"),
  analyticsName: "Mark notifications as archived",
  section: NotificationSection,
  icon: <ArchiveIcon />,
  iconInContextMenu: false,
  perform: ({ stores }) => stores.notifications.markAllAsArchived(),
  visible: ({ stores }) => stores.notifications.orderedData.length > 0,
});

export const rootNotificationActions = [
  markNotificationsAsRead,
  markNotificationsAsArchived,
];
