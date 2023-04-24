import { observer } from "mobx-react";
import * as React from "react";
import Notification from "~/models/Notification";

type Props = {
  notification: Notification;
};

function NotificationListItem({ notification }: Props) {
  return <div>{notification.event}</div>;
}

export default observer(NotificationListItem);
