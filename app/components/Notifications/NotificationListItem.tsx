import { toJS } from "mobx";
import { observer } from "mobx-react";
import { ArchiveIcon, DownloadIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import { s, hover, truncateMultiline } from "@shared/styles";
import { FileOperationState, NotificationEventType } from "@shared/types";
import type Notification from "~/models/Notification";
import useStores from "~/hooks/useStores";
import { Avatar, AvatarSize, AvatarVariant } from "../Avatar";
import Button from "../Button";
import Flex from "../Flex";
import Text from "../Text";
import Time from "../Time";
import { UnreadBadge } from "../UnreadBadge";
import lazyWithRetry from "@shared/utils/lazyWithRetry";
import { ContextMenu } from "../Menu/ContextMenu";
import {
  notificationMarkReadActionFactory,
  notificationMarkUnreadActionFactory,
  notificationArchiveActionFactory,
} from "~/actions/definitions/notifications";
import { useMenuAction } from "~/hooks/useMenuAction";
import AccessRequestActions from "./AccessRequestActions";

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

  const isAccessRequestPending =
    notification.event === NotificationEventType.RequestDocumentAccess &&
    notification.accessRequestStatus === "pending";

  const isExport = notification.event === NotificationEventType.ExportCompleted;
  const { fileOperation, downloadUrl } = notification;

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      void notification.toggleRead();
      return;
    }

    if (downloadUrl) {
      event.preventDefault();
      window.open(downloadUrl, "_blank");
    }

    void notification.markAsRead();

    onNavigate();
  };

  const actions = React.useMemo(
    () => [
      notificationMarkReadActionFactory(notification),
      notificationMarkUnreadActionFactory(notification),
      notificationArchiveActionFactory(notification),
    ],
    [notification]
  );
  const menuAction = useMenuAction(actions);
  const commentData = React.useMemo(
    () => toJS(notification.comment?.data),
    [notification.comment?.data]
  );

  return (
    <ContextMenu action={menuAction} ariaLabel={t("Notification options")}>
      <StyledLink to={notification.path ?? ""} onClick={handleClick}>
        <Container gap={8} $unread={!notification.viewedAt}>
          {isExport ? (
            <ExportIcon state={fileOperation?.state} />
          ) : (
            <StyledAvatar model={notification.actor} />
          )}
          <Flex column>
            {isExport ? (
              <Text as="div" size="small">
                <Text weight="bold">{notification.subject(t)}</Text>{" "}
                {notification.eventText(t)}
              </Text>
            ) : (
              <Text as="div" size="small">
                <Text weight="bold">
                  {notification.actor?.name ?? t("Unknown")}
                </Text>{" "}
                {notification.eventText(t)}{" "}
                <Text weight="bold">{notification.subject(t)}</Text>
              </Text>
            )}
            <Text type="tertiary" size="xsmall">
              <Time dateTime={notification.createdAt} addSuffix />{" "}
              {collection && <>&middot; {collection.displayName} </>}
              {fileOperation && <>&middot; {fileOperation.formatLabel}</>}
            </Text>
            {downloadUrl && (
              <DownloadButton forwardedAs="span" aria-hidden neutral>
                {t("Download")}
              </DownloadButton>
            )}
            {commentData && (
              <StyledCommentEditor value={commentData} readOnly />
            )}
            {isAccessRequestPending && (
              <AccessRequestActions notification={notification} />
            )}
          </Flex>
          {notification.viewedAt ? null : <UnreadBadge />}
        </Container>
      </StyledLink>
    </ContextMenu>
  );
}

/**
 * An icon that shows the state of the export in an export notification.
 */
function ExportIcon({ state }: { state?: FileOperationState }) {
  const theme = useTheme();

  if (state === FileOperationState.Complete) {
    return (
      <IconWrapper>
        <DownloadIcon color={theme.textSecondary} />
      </IconWrapper>
    );
  }

  if (state === FileOperationState.Error) {
    return (
      <IconWrapper>
        <WarningIcon color={theme.danger} />
      </IconWrapper>
    );
  }

  return (
    <IconWrapper>
      <ArchiveIcon color={theme.textTertiary} />
    </IconWrapper>
  );
}

const IconWrapper = styled.div`
  flex-shrink: 0;
  width: ${AvatarSize.Medium}px;
  height: ${AvatarSize.Medium}px;
  margin-top: 4px;
`;

// A visual cue only, as a click anywhere on the row downloads the export.
const DownloadButton = styled(Button)`
  align-self: flex-start;
  margin-top: 8px;
`;

const StyledLink = styled(Link)`
  display: block;
  margin: 0 8px;
  cursor: var(--pointer);
`;

const StyledCommentEditor = styled(CommentEditor)`
  font-size: 0.9em;
  margin-top: 4px;
  pointer-events: none;

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
  padding-block: 8px;
  padding-inline: 12px 40px;
  border-radius: 4px;

  ${StyledLink}[data-state=open] &,
  &:has([data-state="open"]),
  &:${hover},
  &:active {
    background: ${s("listItemHoverBackground")};
  }
`;

export default observer(NotificationListItem);
