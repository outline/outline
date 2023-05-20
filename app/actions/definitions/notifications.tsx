import { MarkAsReadIcon } from "outline-icons";
import * as React from "react";
import { createAction } from "..";
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

export const rootNotificationActions = [markNotificationsAsRead];
