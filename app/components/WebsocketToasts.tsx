import { reaction } from "mobx";
import { observer } from "mobx-react";
import { CommentIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { NotificationEventType, NotificationSource } from "@shared/types";
import useStores from "~/hooks/useStores";
import { commentPath } from "~/utils/routeHelpers";
import { AvatarSize } from "./Avatar";

const WebsocketToasts = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { notifications, ui } = useStores();

  React.useEffect(
    () =>
      reaction(
        () => notifications.latestNotification,
        (notification) => {
          if (
            !notification ||
            notification.isRead ||
            notification.source !== NotificationSource.Websocket
          ) {
            return;
          }

          const activeDocument = ui.activeDocumentId;

          if (!activeDocument || notification.documentId !== activeDocument) {
            return;
          }

          switch (notification.event) {
            case NotificationEventType.CreateComment:
            case NotificationEventType.MentionedInComment: {
              const content =
                notification.event === NotificationEventType.CreateComment
                  ? t("{{ name }} added a comment", {
                      name: notification.actor?.name ?? t("Unknown"),
                    })
                  : t("{{ name }} mentioned you in a comment", {
                      name: notification.actor?.name ?? t("Unknown"),
                    });

              toast.success(content, {
                icon: (
                  <div style={{ marginTop: "7px" }}>
                    <CommentIcon size={AvatarSize.Toast} />
                  </div>
                ),
                action: {
                  label: t("View"),
                  onClick: () => {
                    void notification.markAsRead();
                    history.push(
                      commentPath(notification.document!, notification.comment!)
                    );
                  },
                },
                onDismiss: () => void notification.markAsRead(),
              });
              return;
            }
          }
        }
      ),
    [t, history, notifications, ui]
  );

  return null;
};

export default observer(WebsocketToasts);
