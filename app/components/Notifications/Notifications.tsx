import { observer } from "mobx-react";
import { SubscribeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import { useTheme } from "styled-components";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import useStores from "~/hooks/useStores";
import PaginatedList from "../PaginatedList";
import Scrollable from "../Scrollable";
import Tab from "../Tab";
import Tabs from "../Tabs";
import Text from "../Text";

function Notifications() {
  const { notifications } = useStores();
  const { t } = useTranslation();

  return (
    <div>
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
          renderItem={(item) => <div>{item.id}</div>}
        />
      </Scrollable>
    </div>
  );
}

export default observer(Notifications);
