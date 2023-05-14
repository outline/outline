import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Notification from "~/models/Notification";
import useStores from "~/hooks/useStores";
import Flex from "../Flex";
import PaginatedList from "../PaginatedList";
import Scrollable from "../Scrollable";
import Text from "../Text";
import NotificationListItem from "./NotificationListItem";

type Props = {
  onRequestClose?: () => void;
};

function Notifications({ onRequestClose }: Props) {
  const { notifications } = useStores();
  const { t } = useTranslation();

  return (
    <Flex style={{ width: "100%" }} column>
      <Header>
        <Text weight="bold">{t("Notifications")}</Text>
      </Header>
      <Scrollable flex topShadow>
        <PaginatedList
          fetch={notifications.fetchPage}
          items={notifications.orderedData}
          renderItem={(item: Notification) => (
            <NotificationListItem
              key={item.id}
              notification={item}
              onClick={onRequestClose}
            />
          )}
        />
      </Scrollable>
    </Flex>
  );
}

const Header = styled(Flex)`
  padding: 8px 12px;
`;

export default observer(Notifications);
