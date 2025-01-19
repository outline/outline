import { toJS } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, hover, truncateMultiline } from "@shared/styles";
import Notification from "~/models/Notification";
import CommentEditor from "~/scenes/Document/components/CommentEditor";
import useStores from "~/hooks/useStores";
import { Avatar, AvatarSize } from "../Avatar";
import Flex from "../Flex";
import Text from "../Text";
import Time from "../Time";
import { UnreadBadge } from "../UnreadBadge";

type Props = {
  notification: Notification;
  onNavigate: () => void;
};

function NotificationListItem({ notification, onNavigate }: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const collectionId = notification.document?.collectionId;
  const collection = collectionId ? collections.get(collectionId) : undefined;

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

  return (
    <StyledLink to={notification.path ?? ""} onClick={handleClick}>
      <Container gap={8} $unread={!notification.viewedAt}>
        <StyledAvatar model={notification.actor} size={AvatarSize.Large} />
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
        </Flex>
        {notification.viewedAt ? null : <UnreadBadge style={{ right: 20 }} />}
      </Container>
    </StyledLink>
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

const StyledAvatar = styled(Avatar)`
  margin-top: 4px;
`;

const Container = styled(Flex)<{ $unread: boolean }>`
  position: relative;
  padding: 8px 12px;
  padding-right: 40px;
  border-radius: 4px;

  &:${hover},
  &:active {
    background: ${s("listItemHoverBackground")};
  }
`;

export default observer(NotificationListItem);
