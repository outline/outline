import { observer } from "mobx-react";
import { SubscribeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import Notification from "~/models/Notification";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import useStores from "~/hooks/useStores";
import PaginatedList from "../PaginatedList";
import Scrollable from "../Scrollable";
import Tab from "../Tab";
import Tabs from "../Tabs";
import Text from "../Text";
import NotificationListItem from "./NotificationListItem";

function Notifications() {
  const { notifications } = useStores();
  const { t } = useTranslation();

  return (
    <Wrapper>
      <Text>{t("Notifications")}</Text>
      <Tabs>
        <Tab to="#" isActive={() => true}>
          {t("Inbox")}
        </Tab>
        <Tab to="#" isActive={() => false}>
          {t("Archive")}
        </Tab>
      </Tabs>
      <Scrollable topShadow>
        <PaginatedList
          fetch={notifications.fetchPage}
          items={notifications.orderedData}
          renderItem={(item: Notification) => (
            <NotificationListItem notification={item} />
          )}
        />
      </Scrollable>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  height: 100%;
`;

export default observer(Notifications);
