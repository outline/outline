import { toJS } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s, hover, truncateMultiline } from "@shared/styles";
import { DocumentPermission, NotificationEventType } from "@shared/types";
import type Notification from "~/models/Notification";
import useStores from "~/hooks/useStores";
import { Avatar, AvatarSize, AvatarVariant } from "../Avatar";
import Button from "../Button";
import Flex from "../Flex";
import InputMemberPermissionSelect from "../InputMemberPermissionSelect";
import Text from "../Text";
import Time from "../Time";
import { UnreadBadge } from "../UnreadBadge";
import type { Permission } from "~/types";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { ContextMenu } from "../Menu/ContextMenu";
import { createActionWithChildren } from "~/actions";
import {
  notificationMarkRead,
  notificationMarkUnread,
  notificationArchive,
} from "~/actions/definitions/notifications";
import { NotificationSection } from "~/actions/sections";
import { client } from "~/utils/ApiClient";

const CommentEditor = lazyWithRetry(
  () => import("~/scenes/Document/components/Comments/CommentEditor")
);

type Props = {
  notification: Notification;
  onNavigate: () => void;
};

function NotificationListItem({ notification, onNavigate }: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const collectionId = notification.document?.collectionId;
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const [processing, setProcessing] = React.useState(false);
  const [selectedPermission, setSelectedPermission] =
    React.useState<DocumentPermission>(DocumentPermission.ReadWrite);

  const isAccessRequest =
    notification.event === NotificationEventType.RequestDocumentAccess;

  const permissions: Permission[] = React.useMemo(
    () => [
      {
        label: t("View only"),
        value: DocumentPermission.Read,
      },
      {
        label: t("Can edit"),
        value: DocumentPermission.ReadWrite,
      },
      {
        label: t("Manage"),
        value: DocumentPermission.Admin,
      },
    ],
    [t]
  );

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      void notification.toggleRead();
      return;
    }

    void notification.markAsRead();

    onNavigate();
  };

  const menuAction = React.useMemo(
    () =>
      createActionWithChildren({
        name: ({ t }) => t("Notification options"),
        section: NotificationSection,
        children: [
          notificationMarkRead(notification),
          notificationMarkUnread(notification),
          notificationArchive(notification),
        ],
      }),
    [notification]
  );

  const handleApprove = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!collection || !notification.actor || processing) {
        return;
      }

      setProcessing(true);
      try {
        await client.post("/accessRequests.approve", {
          id: notification.accessRequestId,
          permission: selectedPermission,
        });
        toast.success(
          t(`Permissions for {{ userName }} updated`, {
            userName: notification.actor?.name,
          })
        );
        void notification.markAsRead();
      } catch {
        toast.error(t("Failed to approve access request"));
      } finally {
        setProcessing(false);
      }
    },
    [
      notification,
      processing,
      setProcessing,
      selectedPermission,
      t,
      collection,
      client,
    ]
  );

  const handleDismiss = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (processing) {
        return;
      }

      setProcessing(true);
      try {
        await client.post("/accessRequests.dismiss", {
          id: notification.accessRequestId,
        });
        toast.success(t("Access request dismissed"));
        void notification.markAsRead();
      } catch {
        toast.error(t("Failed to dismiss access request"));
      } finally {
        setProcessing(false);
      }
    },
    [notification, processing, t, client, setProcessing]
  );

  return (
    <ContextMenu action={menuAction} ariaLabel={t("Notification options")}>
      <StyledLink to={notification.path ?? ""} onClick={handleClick}>
        <Container gap={8} $unread={!notification.viewedAt}>
          <StyledAvatar model={notification.actor} />
          <Flex column>
            <Text as="div" size="small">
              <Text weight="bold">
                {notification.actor?.name ?? t("Unknown")}
              </Text>{" "}
              {notification.eventText(t)}{" "}
              <Text weight="bold">{notification.subject}</Text>
            </Text>
            <Text type="tertiary" size="xsmall">
              <Time dateTime={notification.createdAt} addSuffix />{" "}
              {collection && <>&middot; {collection.name}</>}
            </Text>
            {notification.comment && (
              <StyledCommentEditor
                defaultValue={toJS(notification.comment.data)}
              />
            )}
            {isAccessRequest && !notification.viewedAt && (
              <ActionButtons gap={8} align="center">
                <PermissionSelect>
                  <InputMemberPermissionSelect
                    permissions={permissions}
                    value={selectedPermission}
                    onChange={(permission) =>
                      setSelectedPermission(permission as DocumentPermission)
                    }
                    disabled={processing}
                  />
                </PermissionSelect>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  size="small"
                >
                  {t("Approve")}
                </Button>
                <Button
                  onClick={handleDismiss}
                  disabled={processing}
                  neutral
                  size="small"
                >
                  {t("Dismiss")}
                </Button>
              </ActionButtons>
            )}
          </Flex>
          {notification.viewedAt ? null : <UnreadBadge />}
        </Container>
      </StyledLink>
    </ContextMenu>
  );
}

const StyledLink = styled(Link)`
  display: block;
  margin: 0 8px;
  cursor: var(--pointer);
`;

const StyledCommentEditor = styled(CommentEditor)`
  font-size: 0.9em;
  margin-top: 4px;

  ${truncateMultiline(3)}
`;

const StyledAvatar = styled(Avatar).attrs({
  variant: AvatarVariant.Round,
  size: AvatarSize.Medium,
})`
  margin-top: 4px;
`;

const Container = styled(Flex)<{ $unread: boolean }>`
  position: relative;
  padding: 8px 12px;
  padding-right: 40px;
  border-radius: 4px;

  ${StyledLink}[data-state=open] &,
  &:${hover},
  &:active {
    background: ${s("listItemHoverBackground")};
  }
`;

const ActionButtons = styled(Flex)`
  margin-top: 8px;
  flex-wrap: wrap;
`;

const PermissionSelect = styled.div`
  min-width: 140px;
`;

export default observer(NotificationListItem);
