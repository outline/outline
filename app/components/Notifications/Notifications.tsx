import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Notification from "~/models/Notification";
import useStores from "~/hooks/useStores";
import { Inner } from "../Button";
import ButtonSmall from "../ButtonSmall";
import Flex from "../Flex";
import PaginatedList from "../PaginatedList";
import Scrollable from "../Scrollable";
import Text from "../Text";
import NotificationListItem from "./NotificationListItem";

type Props = {
  onRequestClose: () => void;
};

function Notifications({ onRequestClose }: Props) {
  const { notifications } = useStores();
  const { t } = useTranslation();

  return (
    <Flex style={{ width: "100%" }} column>
      <Header justify="space-between">
        <Text weight="bold" as="span">
          {t("Notifications")}
        </Text>
        {notifications.approximateUnreadCount > 0 && (
          <StyledButtonSmall
            neutral
            borderOnHover
            onClick={notifications.markAllAsRead}
          >
            Mark all as read
          </StyledButtonSmall>
        )}
      </Header>
      <Scrollable flex topShadow>
        <PaginatedList
          fetch={notifications.fetchPage}
          items={notifications.orderedData}
          renderItem={(item: Notification) => (
            <NotificationListItem
              key={item.id}
              notification={item}
              onNavigate={onRequestClose}
            />
          )}
        />
      </Scrollable>
    </Flex>
  );
}

const StyledButtonSmall = styled(ButtonSmall)`
  ${Inner} {
    color: ${s("textSecondary")};
  }
`;

const Header = styled(Flex)`
  padding: 8px 18px 12px;
  height: 44px;
`;

export default observer(Notifications);
