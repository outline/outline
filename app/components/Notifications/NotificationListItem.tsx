import { toJS } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import Notification from "~/models/Notification";
import CommentEditor from "~/scenes/Document/components/CommentEditor";
import Avatar from "../Avatar";
import { AvatarSize } from "../Avatar/Avatar";
import Flex from "../Flex";
import Text from "../Text";
import Time from "../Time";

type Props = {
  notification: Notification;
  onClick?: () => void;
};

function NotificationListItem({ notification, onClick }: Props) {
  const { t } = useTranslation();

  return (
    <Link to={notification.path} onClick={onClick}>
      <Container gap={8} $unread={!notification.viewedAt}>
        <Avatar model={notification.actor} size={AvatarSize.Large} />
        <Flex column>
          <Text as="div" size="small">
            <Text as="span" weight="bold">
              {notification.actor.name}
            </Text>{" "}
            {notification.eventText(t)}{" "}
            <Text as="span" weight="bold">
              {notification.subject}
            </Text>
          </Text>
          <Text as="span" type="tertiary" size="xsmall">
            <Time dateTime={notification.createdAt} addSuffix />
          </Text>
          {notification.comment && (
            <StyledCommentEditor
              defaultValue={toJS(notification.comment.data)}
            />
          )}
        </Flex>
      </Container>
    </Link>
  );
}

// ${(props) =>
//   props.$unread && `background: ${props.theme.listItemHoverBackground};`}

const StyledCommentEditor = styled(CommentEditor)`
  font-size: 0.9em;
  margin-top: 4px;
`;

const Container = styled(Flex)<{ $unread: boolean }>`
  padding: 8px 12px;
  margin: 0 8px;
  border-radius: 4px;

  &:hover,
  &:active {
    background: ${s("listItemHoverBackground")};
    cursor: var(--pointer);
  }
`;

export default observer(NotificationListItem);
