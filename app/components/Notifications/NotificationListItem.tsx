import { toJS } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import Notification from "~/models/Notification";
import CommentEditor from "~/scenes/Document/components/CommentEditor";
import useStores from "~/hooks/useStores";
import { hover } from "~/styles";
import Avatar from "../Avatar";
import { AvatarSize } from "../Avatar/Avatar";
import Flex from "../Flex";
import Text from "../Text";
import Time from "../Time";

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
    <Link to={notification.path} onClick={handleClick}>
      <Container gap={8} $unread={!notification.viewedAt}>
        <StyledAvatar model={notification.actor} size={AvatarSize.Large} />
        <Flex column>
          <Text as="div" size="small">
            <Text as="span" weight="bold">
              {notification.actor?.name ?? t("Unknown")}
            </Text>{" "}
            {notification.eventText(t)}{" "}
            <Text as="span" weight="bold">
              {notification.subject}
            </Text>
          </Text>
          <Text as="span" type="tertiary" size="xsmall">
            <Time
              dateTime={notification.createdAt}
              tooltipDelay={1000}
              addSuffix
            />{" "}
            {collection && <>&middot; {collection.name}</>}
          </Text>
          {notification.comment && (
            <StyledCommentEditor
              defaultValue={toJS(notification.comment.data)}
            />
          )}
        </Flex>
        {notification.viewedAt ? null : <Unread />}
      </Container>
    </Link>
  );
}

const StyledCommentEditor = styled(CommentEditor)`
  font-size: 0.9em;
  margin-top: 4px;
`;

const StyledAvatar = styled(Avatar)`
  margin-top: 4px;
`;

const Container = styled(Flex)<{ $unread: boolean }>`
  position: relative;
  padding: 8px 12px;
  margin: 0 8px;
  border-radius: 4px;

  &:${hover},
  &:active {
    background: ${s("listItemHoverBackground")};
    cursor: var(--pointer);
  }
`;

const Unread = styled.div`
  width: 8px;
  height: 8px;
  background: ${s("accent")};
  border-radius: 8px;
  align-self: center;
  position: absolute;
  right: 20px;
`;

export default observer(NotificationListItem);
