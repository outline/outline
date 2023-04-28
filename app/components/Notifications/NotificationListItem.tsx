import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Notification from "~/models/Notification";

type Props = {
  notification: Notification;
};

function NotificationListItem({ notification }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      {notification.actor.name} {notification.eventText(t)}{" "}
      <strong>{notification.subject}</strong>
    </div>
  );
}

export default observer(NotificationListItem);
